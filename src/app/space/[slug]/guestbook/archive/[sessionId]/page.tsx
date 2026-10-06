import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { guestbookDisplayNickname, guestbookVisibleAuthorFilter } from "@/lib/demoData";
import { auth } from "@/auth";
import { GuestbookSessionStatus } from "@prisma/client";
import { formatDotDate as formatDate } from "@/lib/time";
import { ENABLE_GUESTBOOK_COMMENTS } from "@/lib/pilotFlags";
import { hasAnonymousSpaceAccess } from "@/lib/spaceUnlock";
import Divider from "@/components/Divider";
import ArchiveSessionView from "./ArchiveSessionView";

interface Props {
  params: Promise<{ slug: string; sessionId: string }>;
  searchParams: Promise<{ highlight?: string }>;
}

export const metadata: Metadata = { title: "이전 방명록 — 공간큐브" };

export default async function GuestbookArchiveSessionPage({ params, searchParams }: Props) {
  const { slug, sessionId } = await params;
  const { highlight } = await searchParams;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true }, select: { id: true, name: true, slug: true, isDemo: true } });
  if (!space) notFound();

  const guestbookSession = await prisma.guestbookSession.findUnique({ where: { id: sessionId } });
  if (!guestbookSession || guestbookSession.spaceId !== space.id || guestbookSession.status !== GuestbookSessionStatus.ARCHIVED) {
    notFound();
  }

  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
    : null;
  // archive/page.tsx(목록)와 동일한 기준 — 비로그인 방문자는 Record가 없으므로 라이브
  // 방명록과 같은 QR 접근 쿠키 판정을 쓴다(쿠키 만료 후 재방문은 지원하지 않는 한계 동일).
  const canView = user
    ? (await prisma.record.count({ where: { userId: user.id, spaceId: space.id } })) > 0
    : await hasAnonymousSpaceAccess(space.id);

  if (!canView) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
          {"이 공간에 대한 기록을 남기면\n이전 방명록을 볼 수 있어요"}
        </p>
        <Link href={`/space/${slug}`} className="text-xs" style={{ color: "var(--border)" }}>← 공간으로</Link>
      </main>
    );
  }

  const notes = await prisma.guestbookNote.findMany({
    // 방문자 캔버스와 같은 기준 — 실제 글 + 방명록 샘플(표시용). 다른 더미 계정 흔적은 시연 공간에서만(src/lib/demoData.ts).
    where: { guestbookSessionId: guestbookSession.id, isHidden: false, deletedAt: null, ...guestbookVisibleAuthorFilter(space.isDemo) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      nickname: true,
      user: { select: { isDemo: true } },
      createdAt: true,
      _count: { select: { reactions: true, comments: true } },
      reactions: user ? { where: { userId: user.id }, select: { id: true } } : false,
    },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">{space.name} / 이전 방명록</p>
          <Link href={`/space/${slug}/guestbook/archive`} className="text-xs" style={{ color: "var(--dim)" }}>← 목록</Link>
        </div>
        <Divider />
      </div>

      <div className="space-y-1">
        <h1 className="text-lg font-bold">
          {guestbookSession.startsAt ? formatDate(guestbookSession.startsAt) : "—"} – {guestbookSession.endsAt ? formatDate(guestbookSession.endsAt) : "—"}
        </h1>
        {(guestbookSession.question1 || guestbookSession.question2) && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            {[guestbookSession.question1, guestbookSession.question2].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 남겨진 방명록이 없습니다</p>
      ) : (
        <ArchiveSessionView
          isLoggedIn={!!session?.user?.id}
          highlightId={highlight ?? null}
          enableComments={ENABLE_GUESTBOOK_COMMENTS}
          notes={notes.map((n) => ({
            id: n.id,
            content: n.content,
            nickname: guestbookDisplayNickname(n.nickname, !!n.user?.isDemo, space.isDemo),
            createdAt: formatDate(n.createdAt),
            reactionCount: n._count.reactions,
            reactedByMe: Array.isArray(n.reactions) && n.reactions.length > 0,
            commentCount: n._count.comments,
          }))}
        />
      )}
    </main>
  );
}
