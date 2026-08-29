import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { GuestbookFunnelStep } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { resolveCurrentVisitRecord } from "@/lib/visit";
import { requireSpaceUnlock, canBypassSpaceLock } from "@/lib/spaceUnlock";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";
import { recordGuestbookFunnelStep, recordGuestbookLoginSuccessIfPending } from "@/lib/guestbookFunnel";
import SpaceLockNotice from "@/components/SpaceLockNotice";
import RecordForm from "./RecordForm";

// 뒤로가기/새로고침으로 돌아왔을 때도 항상 최신 DB 상태를 기준으로 프리필해야 하므로
// 이 페이지는 캐시하지 않는다.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ intent?: string }>;
}

interface DisplayTagLink {
  tag: { name: string; categoryRef: { name: string; displayOrder: number } | null };
}

/** 노출 태그를 카테고리별로 묶는다 — 카테고리 표시 순서(displayOrder) 기준 정렬, 미분류는 맨 뒤. */
function groupDisplayTagsByCategory(links: DisplayTagLink[]): { category: string; names: string[] }[] {
  const groups = new Map<string, { order: number; names: string[] }>();
  for (const link of links) {
    const category = link.tag.categoryRef?.name ?? "기타";
    const order = link.tag.categoryRef?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (!groups.has(category)) groups.set(category, { order, names: [] });
    groups.get(category)!.names.push(link.tag.name);
  }
  return [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([category, g]) => ({ category, names: g.names }));
}

export default async function RecordPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { intent: intentParam } = await searchParams;
  const intent = intentParam === "unlock" ? "unlock" : "record";

  const session = await auth();
  if (!session?.user?.id) {
    const callback = `/space/${slug}/record${intentParam ? `?intent=${intentParam}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    include: {
      spaceTagLinks: {
        where: { visibleToUsers: true, tag: { isActive: true } },
        orderBy: { weight: "desc" },
        include: { tag: { select: { name: true, categoryRef: { select: { name: true, displayOrder: true } } } } },
      },
    },
  });
  if (!space) notFound();

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) notFound();

  // 취향 점수 입력은 이 공간의 이야기를 여는 관문이다 — Cube QR로 실제 잠금을 해제한
  // 사용자만 접근 가능(관리자·해당 공간 운영자는 예외). URL을 알아도 직접 접근으로는
  // 열리지 않는다: /api/records도 동일한 기준으로 다시 검증한다.
  const bypass = canBypassSpaceLock(session.user.email, space, user.id);
  const unlocked = bypass || (await requireSpaceUnlock(user.id, space.id));
  if (!unlocked) {
    return (
      <main className="flex flex-col min-h-screen px-6 py-8 gap-6 items-center justify-center">
        <SpaceLockNotice naverMapUrl={space.naverMapUrl} backHref={`/space/${slug}`} backLabel="공간으로 돌아가기" />
      </main>
    );
  }

  // 방명록 퍼널 계측 — "방명록 열기" CTA는 로그인 여부와 무관하게 항상 이 페이지(또는
  // 비로그인이면 이 페이지로 가는 /login)를 거치므로, 여기 도달하는 것 자체가 로그인
  // 사용자 쪽에서 관측 가능한 "방명록 방향으로 이동 시도"의 유일한 지점이다. 관리자 세션은
  // 검수 목적 열람이라 기록하지 않는다(Story View와 동일한 정책). anonId 쿠키가 남아있고
  // 그 방문자가 이 공간에서 로그인 요구를 겪은 적이 있으면(§로그인 페이지에서 기록) 지금이
  // 그 로그인이 성공한 시점이라고 보고 LOGIN_SUCCESS를 함께 기록한다.
  if (!isAdmin(session.user.email)) {
    await recordGuestbookFunnelStep({ spaceId: space.id, step: GuestbookFunnelStep.ENTRY_ATTEMPT, userId: user.id });
    const anonId = (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;
    await recordGuestbookLoginSuccessIfPending(space.id, user.id, anonId);
  }

  const previousRecords = await prisma.record.findMany({
    where: { userId: user.id, spaceId: space.id },
    include: { tags: true },
    orderBy: { visitedAt: "desc" },
  });

  const visitCount = previousRecords.length;
  const lastRecord = previousRecords[0] ?? null;

  // "이번 방문"의 Record 판정: /api/records가 새 Record를 만들지, 기존 것을 갱신할지
  // 정하는 기준(REVISIT_INTERVAL_HOURS)과 동일하게 판단한다. 아직 재방문 간격이
  // 지나지 않았다면 lastRecord가 곧 이번 방문에 저장된 Record다 — 이미 취향 점수를
  // 저장했다는 뜻이므로 폼을 그 값으로 프리필하고 재입력을 강요하지 않는다.
  const currentVisitRecord = resolveCurrentVisitRecord(lastRecord);

  // 관리자가 연결한 활성 태그가 있으면 카테고리별로 묶어서 쓰고, 없으면 기존 레거시 태그로 폴백
  const displayTagGroups = space.spaceTagLinks.length > 0
    ? groupDisplayTagsByCategory(space.spaceTagLinks)
    : null;

  return (
    <RecordForm
      space={{ id: space.id, name: space.name, slug: space.slug, tagline: space.tagline }}
      spaceTags={space.spaceTags}
      displayTagGroups={displayTagGroups}
      visitCount={visitCount}
      previousRecord={lastRecord ? { tags: lastRecord.tags.map((t) => t.tag), tasteScore: lastRecord.tasteScore } : null}
      currentVisitRecord={currentVisitRecord}
      intent={intent}
    />
  );
}
