import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveCurrentVisitRecord } from "@/lib/visit";
import { requireSpaceUnlock } from "@/lib/spaceUnlock";
import { isAdmin } from "@/lib/admin";
import SpaceLockNotice from "@/components/SpaceLockNotice";
import RecordForm from "./RecordForm";

// 뒤로가기/새로고침으로 돌아왔을 때도 항상 최신 DB 상태를 기준으로 프리필해야 하므로
// 이 페이지는 캐시하지 않는다.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ intent?: string }>;
}

export default async function RecordPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { intent: intentParam } = await searchParams;
  const intent = intentParam === "unlock" ? "unlock" : "record";

  const session = await auth();
  if (!session?.user?.email) {
    const callback = `/space/${slug}/record${intentParam ? `?intent=${intentParam}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    include: {
      spaceTagLinks: {
        where: { visibleToUsers: true, tag: { isActive: true } },
        orderBy: { weight: "desc" },
        include: { tag: { select: { name: true } } },
      },
    },
  });
  if (!space) notFound();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) notFound();

  // 취향 점수 입력은 이 공간의 이야기를 여는 관문이다 — Cube QR로 실제 잠금을 해제한
  // 사용자만 접근 가능(관리자·해당 공간 운영자는 예외). URL을 알아도 직접 접근으로는
  // 열리지 않는다: /api/records도 동일한 기준으로 다시 검증한다.
  const bypass = isAdmin(session.user.email) || (!!space.ownerId && space.ownerId === user.id);
  const unlocked = bypass || (await requireSpaceUnlock(user.id, space.id));
  if (!unlocked) {
    return (
      <main className="flex flex-col min-h-screen px-6 py-8 gap-6 items-center justify-center">
        <SpaceLockNotice naverMapUrl={space.naverMapUrl} backHref={`/space/${slug}`} backLabel="공간으로 돌아가기" />
      </main>
    );
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

  // 관리자가 연결한 활성 태그가 있으면 그 이름을 쓰고, 없으면 기존 레거시 태그로 폴백
  const displayTags = space.spaceTagLinks.length > 0
    ? space.spaceTagLinks.slice(0, 6).map((l) => l.tag.name)
    : null;

  return (
    <RecordForm
      space={{ id: space.id, name: space.name, slug: space.slug, tagline: space.tagline }}
      spaceTags={space.spaceTags}
      displayTags={displayTags}
      visitCount={visitCount}
      previousRecord={lastRecord ? { tags: lastRecord.tags.map((t) => t.tag), tasteScore: lastRecord.tasteScore } : null}
      currentVisitRecord={currentVisitRecord}
      intent={intent}
    />
  );
}
