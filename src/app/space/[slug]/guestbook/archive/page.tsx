import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { GuestbookSessionStatus } from "@prisma/client";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "이전 방명록 — 공간큐브" };

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function GuestbookArchiveListPage({ params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true }, select: { id: true, name: true, slug: true } });
  if (!space) notFound();

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

  const sessions = await prisma.guestbookSession.findMany({
    where: { spaceId: space.id, status: GuestbookSessionStatus.ARCHIVED },
    orderBy: { startsAt: "desc" },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">{space.name} / 이전 방명록</p>
          <Link href={`/space/${slug}/guestbook`} className="text-xs" style={{ color: "var(--dim)" }}>← 방명록</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 종료된 방명록이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/space/${slug}/guestbook/archive/${s.id}`}
              className="block p-4 border space-y-1 transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-sm font-medium">{formatDate(s.startsAt)} – {formatDate(s.endsAt)}</p>
              {(s.question1 || s.question2) && (
                <p className="text-xs" style={{ color: "var(--dim)" }}>{[s.question1, s.question2].filter(Boolean).join(" · ")}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
