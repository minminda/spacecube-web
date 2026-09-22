import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { GuestbookSessionStatus } from "@prisma/client";
import { formatDotDate as formatDate } from "@/lib/time";
import { hasAnonymousSpaceAccess } from "@/lib/spaceUnlock";
import Divider from "@/components/Divider";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "이전 방명록 — 공간큐브" };

export default async function GuestbookArchiveListPage({ params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true }, select: { id: true, name: true, slug: true } });
  if (!space) notFound();

  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
    : null;
  // 로그인 사용자는 이 공간에 남긴 기록(Record, 영구)으로 "방문한 적 있음"을 판정한다.
  // 비로그인 방문자는 Record 자체가 없으므로(User가 없음), 라이브 방명록(guestbook/page.tsx)과
  // 동일한 기준(QR을 실제로 스캔한 유효 접근 쿠키)으로 판정한다 — 세션이 아카이브됐다는
  // 이유만으로 방금 흔적을 남긴 비로그인 방문자가 자기 글을 영영 못 보게 되는 것을 막는다.
  // 이 쿠키(12시간)가 만료된 뒤 재방문하는 경우까지는 지원하지 않는다 — 비로그인 신원은
  // 쿠키가 살아있는 동안만 증명 가능하다는 한계가 있다(향후 로그인 연동 시 재검토 필요).
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
        <Divider />
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 종료된 방명록이 없습니다</p>
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
