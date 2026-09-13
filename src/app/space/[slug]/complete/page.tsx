import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { GuestbookFunnelStep } from "@prisma/client";
import { recordGuestbookFunnelStep } from "@/lib/guestbookFunnel";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";
import Divider from "@/components/Divider";

/* ── 방문 완료 페이지(첫 방문 흐름 단순화) ──────────────────────────────
   방명록 캔버스에서 "경험 마치기"를 눌렀을 때 도달한다. 로그인 여부와 무관하게 동작하며,
   추천/취향 업데이트를 강제로 보여주지 않는다(그 기능 자체는 삭제하지 않았다 —
   guestbookReward.ts/RecommendationCard.tsx는 그대로 남아 있고, /archive/taste 등 다른
   경로에서 계속 쓸 수 있다). 역할은 오직 "방문 경험을 짧게 종료하는 것"뿐이다.
   ?note=<id>는 이번에 작성한 포스트잇이 있을 때만 GuestbookCanvas가 붙여준다 — recordId가
   아니라 노트 id로 소유권을 확인하므로 비로그인 방문자도 동일하게 동작한다. ──*/

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ note?: string }>;
}

export const metadata: Metadata = {
  title: "방문 완료 — 공간큐브",
};

export default async function VisitCompletePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { note: noteId } = await searchParams;

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true },
  });
  if (!space) notFound();

  const session = await auth();
  const anonId = session?.user?.id ? null : (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;

  // 이번에 작성한 노트가 실제로 이 방문자의 것인지 확인한다(다른 사람/다른 공간의 노트 id를
  // 넣어도 소유권이 일치하지 않으면 무시 — "작성함" 문구를 부당하게 노출하지 않기 위함).
  let wroteThisVisit = false;
  if (noteId) {
    const note = await prisma.guestbookNote.findUnique({
      where: { id: noteId },
      select: { spaceId: true, userId: true, anonId: true },
    });
    if (note && note.spaceId === space.id) {
      wroteThisVisit = session?.user?.id ? note.userId === session.user.id : !!anonId && note.anonId === anonId;
    }
  }

  if (!isAdmin(session?.user?.email)) {
    await recordGuestbookFunnelStep({
      spaceId: space.id,
      step: GuestbookFunnelStep.EXPERIENCE_COMPLETE,
      userId: session?.user?.id ?? null,
      anonId,
    });
  }

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 / COMPLETE</p>
        <Divider />
      </div>

      <div className="space-y-2">
        {wroteThisVisit ? (
          <p className="text-xl font-bold leading-snug break-keep whitespace-pre-line">
            {"당신의 이야기가\n이 공간에 남았습니다"}
          </p>
        ) : (
          <p className="text-xl font-bold leading-snug break-keep whitespace-pre-line">
            {"이 공간의 이야기를\n함께해주셔서 감사합니다"}
          </p>
        )}
      </div>

      <Divider />

      <div className="flex flex-col gap-3">
        <Link
          href={`/space/${space.slug}`}
          className="tap-target flex items-center justify-center w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          이 공간 더보기
        </Link>
        {session?.user?.id ? (
          <Link href="/archive" className="text-xs text-center py-1" style={{ color: "var(--dim)" }}>
            내 아카이브
          </Link>
        ) : (
          <Link href="/" className="text-xs text-center py-1" style={{ color: "var(--dim)" }}>
            홈으로
          </Link>
        )}
      </div>
    </main>
  );
}
