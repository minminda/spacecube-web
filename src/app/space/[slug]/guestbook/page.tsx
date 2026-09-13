import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { GuestbookSessionStatus, GuestbookFunnelStep } from "@prisma/client";
import { getVisibleClusters } from "@/lib/guestbookSession";
import { formatDotDate as formatDate } from "@/lib/time";
import { requireSpaceUnlock, canBypassSpaceLock, hasAnonymousSpaceAccess } from "@/lib/spaceUnlock";
import { resolveCurrentVisitRecord } from "@/lib/visit";
import { upsertCurrentRecord } from "@/lib/recordVisit";
import { isAdmin } from "@/lib/admin";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";
import { recordGuestbookFunnelStep, recordGuestbookLoginSuccessIfPending } from "@/lib/guestbookFunnel";
import { ENABLE_GUESTBOOK_IMAGE, ENABLE_GUESTBOOK_COMMENTS } from "@/lib/pilotFlags";
import SpaceLockNotice from "@/components/SpaceLockNotice";
import GuestbookCanvas from "./GuestbookCanvas";
import type { GuestbookNoteData } from "./canvasConstants";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { name: true },
  });
  if (!space) return {};
  return {
    title: `${space.name}에 남겨진 흔적 — 공간큐브`,
    description: "이 공간을 다녀간 사람들이 남긴 작은 기록들입니다.",
  };
}


// 관리자 설정이 없는 공간이 쓰는 기본값
const DEFAULT_SETTINGS = {
  backgroundType: "color" as const,
  backgroundColor: "#000000",
  backgroundImageUrl: null as string | null,
  backgroundOpacity: 1,
  layoutType: "scatter" as const,
  defaultPostitColor: "#F6E7A8",
  initialZoom: 1,
  initialX: 0,
  initialY: 0,
  allowRotation: true,
  allowImage: true,
  showNickname: true,
};

/* ── 첫 방문 흐름 단순화 ────────────────────────────────────────────
   로그인/취향 점수는 더 이상 방명록 열람·작성의 관문이 아니다(Story → 방명록 열기 →
   Guestbook이 즉시 이어져야 한다). 열람 권한은 Episode 페이지와 동일하게 "Cube QR을
   실제로 인식했는가"(SpaceUnlock/hasAnonymousSpaceAccess)만으로 판정한다.

   로그인 사용자는 취향 점수 없이도 이번 방문의 Record를 서버가 조용히 확보한다(이미 점수를
   넣었다면 절대 건드리지 않음 — upsertCurrentRecord 계약). 비로그인 사용자는 Record를 만들 수
   없으므로(User가 없음) sc_anon_id 쿠키(anonId)를 "방문" 단위로 그대로 쓴다 — GuestbookNote/
   GuestbookReaction/GuestbookComment의 userId가 nullable + anonId 컬럼을 갖도록 스키마를
   확장해뒀다(EpisodeRead/GuestbookFunnelEvent와 동일 패턴). ── */
export default async function GuestbookPage({ params }: Props) {
  const { slug } = await params;

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, ownerId: true, naverMapUrl: true },
  });
  if (!space) notFound();

  const session = await auth();
  // 로그인 여부와 무관하게 한 번만 읽는다 — 로그인 사용자는 "로그인 직전 익명 방문"과의
  // 연결(LOGIN_SUCCESS 계측)에, 비로그인 사용자는 본인 식별 자체에 쓴다.
  const anonCookieValue = (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;
  const anonId = session?.user?.id ? null : anonCookieValue;

  let unlocked = false;
  let nickname: string | null = null;
  // 직전 방문 시각 — 이 시각 이후에 생긴 남의 흔적을 "새로운 흔적"으로 취급한다.
  // 첫 방문(직전 방문이 없음)이면 null — 아무 것도 "새로 생긴 것"으로 표시하지 않는다.
  let previousVisitAt: Date | null = null;
  // 이번 방문(가장 최근 인정된 Record)의 id — 로그인 사용자만 존재, 비로그인은 항상 null.
  let currentRecordId: string | null = null;

  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, nickname: true } })
    : null;

  if (user) {
    nickname = user.nickname;
    const bypass = canBypassSpaceLock(session!.user!.email, space, user.id);
    unlocked = bypass || (await requireSpaceUnlock(user.id, space.id));
  } else {
    // Episode 페이지와 동일한 판정 — 유효한 QR 접근 쿠키만 있으면 로그인 없이도 열람 가능.
    unlocked = await hasAnonymousSpaceAccess(space.id);
  }

  // 방명록은 이 공간의 이야기다 — Cube QR로 실제 잠금을 해제하지 않았다면 URL을 알아도
  // 열리지 않는다(관리자·해당 공간 운영자는 예외).
  if (!unlocked) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <SpaceLockNotice naverMapUrl={space.naverMapUrl} backHref={`/space/${slug}`} backLabel="공간으로 돌아가기" />
        {!session && (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/space/${slug}/guestbook`)}`}
            className="text-xs"
            style={{ color: "var(--border)" }}
          >
            이미 큐브를 스캔했다면 로그인해서 이어가기 →
          </Link>
        )}
      </main>
    );
  }

  // 방명록 퍼널 계측(record/page.tsx와 동일한 정책) — 로그인/비로그인 공통으로 "방명록 방향
  // 진입"을 기록한다. 로그인 사용자는 이 공간의 로그인 요구를 겪었던 anonId 방문자가 지금
  // 로그인 상태로 도달했다면 LOGIN_SUCCESS도 함께 기록한다.
  if (!isAdmin(session?.user?.email)) {
    await recordGuestbookFunnelStep({
      spaceId: space.id,
      step: GuestbookFunnelStep.ENTRY_ATTEMPT,
      userId: user?.id ?? null,
      anonId,
    });
    if (user) {
      await recordGuestbookLoginSuccessIfPending(space.id, user.id, anonCookieValue);
    }
  }

  // 로그인 사용자는 취향 점수 입력 없이도 이번 방문의 Record를 조용히 확보한다 — 더 이상
  // /space/[slug]/record를 거치지 않아도 "방문 1회당 흔적 1개" 정책이 그대로 작동한다.
  // previousVisitAt은 이 ensure 호출이 새 Record를 만들지(=지금이 새 방문) 기존 걸 갱신할지
  // (=이미 이번 방문의 Record가 있음)를 먼저 판정해 기존과 동일한 재방문 안내 기준을 유지한다.
  if (user) {
    const recentRecords = await prisma.record.findMany({
      where: { userId: user.id, spaceId: space.id },
      orderBy: { visitedAt: "desc" },
      take: 2,
      select: { id: true, visitedAt: true, tasteScore: true },
    });
    const alreadyCurrent = resolveCurrentVisitRecord(recentRecords[0] ?? null);
    previousVisitAt = alreadyCurrent ? (recentRecords[1]?.visitedAt ?? null) : (recentRecords[0]?.visitedAt ?? null);

    const { record } = await upsertCurrentRecord(user.id, space.id, {});
    currentRecordId = record.id;
  }

  const activeSession = await prisma.guestbookSession.findFirst({
    where: { spaceId: space.id, status: GuestbookSessionStatus.ACTIVE },
  });

  // 진행 중인 방명록 세션이 없으면(드물지만 관리자 조작 등으로 발생 가능) 빈 캔버스 대신 안내를 보여준다.
  if (!activeSession) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          지금은 방명록이 준비 중입니다. 곧 다시 열릴 예정이에요
        </p>
        <Link href={`/space/${slug}`} className="text-xs" style={{ color: "var(--border)" }}>← 공간으로</Link>
      </main>
    );
  }

  const [dbNotes, settingsRow, commentedThisVisitCount] = await Promise.all([
    prisma.guestbookNote.findMany({
      where: { guestbookSessionId: activeSession.id, isHidden: false, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, userId: true, anonId: true, recordId: true, content: true, nickname: true, imageUrl: true,
        x: true, y: true, rotation: true, color: true, createdAt: true,
        _count: { select: { reactions: true, comments: true } },
        reactions: user
          ? { where: { userId: user.id }, select: { id: true } }
          : anonId
            ? { where: { anonId }, select: { id: true } }
            : false,
      },
    }),
    prisma.guestbookSettings.findUnique({ where: { spaceId: space.id } }),
    user && currentRecordId
      ? prisma.guestbookComment.count({
          where: { userId: user.id, guestbookSessionId: activeSession.id, recordId: currentRecordId },
        })
      : anonId
        ? prisma.guestbookComment.count({ where: { anonId, guestbookSessionId: activeSession.id } })
        : Promise.resolve(0),
    // 신규 계측(GUESTBOOK_VIEWED) — 캔버스가 실제로 렌더되는 시점, 로그인/비로그인 공통.
    !isAdmin(session?.user?.email)
      ? recordGuestbookFunnelStep({
          spaceId: space.id,
          step: GuestbookFunnelStep.GUESTBOOK_VIEWED,
          userId: user?.id ?? null,
          anonId,
        })
      : Promise.resolve(),
    // 기존 파일럿 최소 계측(guestbook_view, Record 기준) — 이번 방문이 실제로 방명록 캔버스에
    // 도달했음을 1회만 기록한다. 로그인 사용자만 대상(비로그인은 Record 자체가 없음).
    currentRecordId && !isAdmin(session?.user?.email)
      ? prisma.record.updateMany({
          where: { id: currentRecordId, guestbookViewedAt: null },
          data: { guestbookViewedAt: new Date() },
        }).catch(() => {})
      : Promise.resolve(),
  ]);

  // "한 번의 방문은 하나의 흔적을 남긴다" — 로그인은 Record(recordId) 기준, 비로그인은
  // anonId 기준(anonId 자체가 12시간마다 새로 발급되는 방문 단위 경계).
  const isMine = (n: (typeof dbNotes)[number]) => (user ? n.userId === user.id : !!anonId && n.anonId === anonId);
  const myNotes = dbNotes.filter(isMine);
  const myNoteId = myNotes.length > 0 ? myNotes[myNotes.length - 1].id : null; // dbNotes는 createdAt asc이므로 마지막이 최신
  const canWriteThisVisit = user
    ? !!currentRecordId && !myNotes.some((n) => n.recordId === currentRecordId)
    : myNotes.length === 0;
  const hasCommentedThisVisit = commentedThisVisitCount > 0;

  const isNewNote = (n: (typeof dbNotes)[number]) => !!previousVisitAt && !isMine(n) && n.createdAt > previousVisitAt;

  const newNotesCount = dbNotes.filter(isNewNote).length;

  const initialNotes: GuestbookNoteData[] = dbNotes.map((n) => ({
    id: n.id,
    userId: n.userId ?? undefined,
    content: n.content,
    nickname: n.nickname,
    imageUrl: n.imageUrl,
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    color: n.color,
    createdAt: formatDate(n.createdAt),
    isNew: isNewNote(n),
    reactionCount: n._count.reactions,
    reactedByMe: Array.isArray(n.reactions) && n.reactions.length > 0,
    commentCount: n._count.comments,
  }));

  const clusters = getVisibleClusters(activeSession);

  const settings = settingsRow
    ? {
        backgroundType: settingsRow.backgroundType as "color" | "image",
        backgroundColor: settingsRow.backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
        backgroundImageUrl: settingsRow.backgroundImageUrl,
        backgroundOpacity: settingsRow.backgroundOpacity,
        layoutType: settingsRow.layoutType as "scatter" | "grid" | "radial",
        defaultPostitColor: settingsRow.defaultPostitColor,
        initialZoom: settingsRow.initialZoom,
        initialX: settingsRow.initialX,
        initialY: settingsRow.initialY,
        allowRotation: settingsRow.allowRotation,
        allowImage: settingsRow.allowImage,
        showNickname: settingsRow.showNickname,
      }
    : DEFAULT_SETTINGS;

  return (
    <main>
      <Suspense fallback={null}>
        <GuestbookCanvas
          space={space}
          initialNotes={initialNotes}
          isLoggedIn={!!session?.user?.id}
          initialMyNoteId={myNoteId}
          initialCanWriteThisVisit={canWriteThisVisit}
          hasCommentedThisVisit={hasCommentedThisVisit}
          nickname={nickname}
          settings={settings}
          newNotesCount={newNotesCount}
          clusters={clusters}
          currentUserId={user?.id ?? null}
          currentAnonId={anonId}
          enableImage={ENABLE_GUESTBOOK_IMAGE}
          enableComments={ENABLE_GUESTBOOK_COMMENTS}
        />
      </Suspense>
    </main>
  );
}
