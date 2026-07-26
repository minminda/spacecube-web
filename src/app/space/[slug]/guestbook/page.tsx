import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { GuestbookSessionStatus } from "@prisma/client";
import { getVisibleClusters } from "@/lib/guestbookSession";
import { resolveCurrentVisitRecordId } from "@/lib/guestbookVisit";
import { formatDotDate as formatDate } from "@/lib/time";
import { requireSpaceUnlock, canBypassSpaceLock } from "@/lib/spaceUnlock";
import { ENABLE_GUESTBOOK_IMAGE, ENABLE_GUESTBOOK_COMMENTS } from "@/lib/pilotFlags";
import SpaceLockNotice from "@/components/SpaceLockNotice";
import GuestbookCanvas from "./GuestbookCanvas";
import type { GuestbookNoteData } from "./canvasConstants";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ visit?: string }>;
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

export default async function GuestbookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { visit: requestedVisitId = null } = await searchParams;

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, ownerId: true, naverMapUrl: true },
  });
  if (!space) notFound();

  const session = await auth();
  let myNoteId: string | null = null;
  let hasRecord = false;
  let unlocked = false;
  let nickname: string | null = null;
  // 직전 방문 시각 — 이 시각 이후에 생긴 남의 흔적을 "새로운 흔적"으로 취급한다.
  // 첫 방문(직전 방문이 없음)이면 null — 아무 것도 "새로 생긴 것"으로 표시하지 않는다.
  let previousVisitAt: Date | null = null;
  // 이번 방문(가장 최근 Record)의 id — "방문 1회당 흔적/댓글 1개" 정책의 기준.
  let currentRecordId: string | null = null;

  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, nickname: true } })
    : null;

  if (user) {
    nickname = user.nickname;
    const recentRecords = await prisma.record.findMany({
      where: { userId: user.id, spaceId: space.id },
      orderBy: { visitedAt: "desc" },
      take: 2,
      select: { id: true, visitedAt: true },
    });
    hasRecord = recentRecords.length > 0;
    // ?visit=<recordId>가 실제로 이 사용자·공간의 Record면 그걸 "이번 방문"으로 신뢰하고,
    // 없거나 조작된 값이면 가장 최근 Record로 안전하게 폴백한다(점수 값은 쿼리에 담지 않음).
    currentRecordId = resolveCurrentVisitRecordId(requestedVisitId, recentRecords);
    previousVisitAt = recentRecords.length > 1 ? recentRecords[1].visitedAt : null;

    const bypass = canBypassSpaceLock(session!.user!.email, space, user.id);
    unlocked = bypass || (await requireSpaceUnlock(user.id, space.id));
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

  // 잠금은 풀렸지만 아직 이번 방문의 취향 점수(Record)를 저장하지 않았다면 방명록 열람 전에 유도한다.
  if (!hasRecord) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
          {"이 공간에 대한 기록을 남기면\n다른 방문자들의 이야기를 볼 수 있어요."}
        </p>
        <Link
          href={`/space/${slug}/record`}
          className="inline-block text-sm py-3 px-6 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          기록하고 흔적 열기
        </Link>
        <Link href={`/space/${slug}`} className="text-xs" style={{ color: "var(--border)" }}>← 공간으로</Link>
      </main>
    );
  }

  const activeSession = await prisma.guestbookSession.findFirst({
    where: { spaceId: space.id, status: GuestbookSessionStatus.ACTIVE },
  });

  // 진행 중인 방명록 세션이 없으면(드물지만 관리자 조작 등으로 발생 가능) 빈 캔버스 대신 안내를 보여준다.
  if (!activeSession) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          지금은 방명록이 준비 중입니다. 곧 다시 열릴 예정이에요.
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
        id: true, userId: true, recordId: true, content: true, nickname: true, imageUrl: true,
        x: true, y: true, rotation: true, color: true, createdAt: true,
        _count: { select: { reactions: true, comments: true } },
        reactions: user ? { where: { userId: user.id }, select: { id: true } } : false,
      },
    }),
    prisma.guestbookSettings.findUnique({ where: { spaceId: space.id } }),
    user && currentRecordId
      ? prisma.guestbookComment.count({
          where: { userId: user.id, guestbookSessionId: activeSession.id, recordId: currentRecordId },
        })
      : Promise.resolve(0),
  ]);

  // "한 번의 방문은 하나의 흔적을 남긴다" — 내 흔적 중 가장 최근 것(있다면), 그리고 이번 방문에
  // 아직 흔적을 안 남겼는지(=이번 방문 recordId로 쓴 노트가 없는지)를 함께 계산한다.
  const myNotes = user ? dbNotes.filter((n) => n.userId === user.id) : [];
  myNoteId = myNotes.length > 0 ? myNotes[myNotes.length - 1].id : null; // dbNotes는 createdAt asc이므로 마지막이 최신
  const canWriteThisVisit = !!currentRecordId && !myNotes.some((n) => n.recordId === currentRecordId);
  const hasCommentedThisVisit = commentedThisVisitCount > 0;

  const isNewNote = (n: (typeof dbNotes)[number]) =>
    !!previousVisitAt && n.userId !== user?.id && n.createdAt > previousVisitAt;

  const newNotesCount = dbNotes.filter(isNewNote).length;

  const initialNotes: GuestbookNoteData[] = dbNotes.map((n) => ({
    id: n.id,
    userId: n.userId,
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
          currentRecordId={currentRecordId}
          enableImage={ENABLE_GUESTBOOK_IMAGE}
          enableComments={ENABLE_GUESTBOOK_COMMENTS}
        />
      </Suspense>
    </main>
  );
}
