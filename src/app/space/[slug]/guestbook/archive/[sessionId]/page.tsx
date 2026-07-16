import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { GuestbookSessionStatus } from "@prisma/client";
import { formatDotDate as formatDate } from "@/lib/time";
import { ENABLE_GUESTBOOK_COMMENTS } from "@/lib/pilotFlags";
import ArchiveSessionView from "./ArchiveSessionView";

interface Props {
  params: Promise<{ slug: string; sessionId: string }>;
  searchParams: Promise<{ highlight?: string }>;
}

export const metadata: Metadata = { title: "이전 방명록 — 공간큐브" };

export default async function GuestbookArchiveSessionPage({ params, searchParams }: Props) {
  const { slug, sessionId } = await params;
  const { highlight } = await searchParams;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true }, select: { id: true, name: true, slug: true } });
  if (!space) notFound();

  const guestbookSession = await prisma.guestbookSession.findUnique({ where: { id: sessionId } });
  if (!guestbookSession || guestbookSession.spaceId !== space.id || guestbookSession.status !== GuestbookSessionStatus.ARCHIVED) {
    notFound();
  }

  const session = await auth();
  const user = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;
  const hasRecord = user ? (await prisma.record.count({ where: { userId: user.id, spaceId: space.id } })) > 0 : false;

  if (!hasRecord) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
          {"이 공간에 대한 기록을 남기면\n이전 방명록을 볼 수 있어요."}
        </p>
        <Link href={`/space/${slug}`} className="text-xs" style={{ color: "var(--border)" }}>← 공간으로</Link>
      </main>
    );
  }

  const notes = await prisma.guestbookNote.findMany({
    where: { guestbookSessionId: guestbookSession.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      nickname: true,
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
        <p className="text-xs">─────────────────────────────</p>
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
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 남겨진 방명록이 없습니다.</p>
      ) : (
        <ArchiveSessionView
          isLoggedIn={!!session?.user?.email}
          currentUserId={user?.id ?? null}
          highlightId={highlight ?? null}
          enableComments={ENABLE_GUESTBOOK_COMMENTS}
          notes={notes.map((n) => ({
            id: n.id,
            content: n.content,
            nickname: n.nickname,
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
