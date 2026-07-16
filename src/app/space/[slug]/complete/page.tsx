import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildRewardSummary } from "@/lib/guestbookReward";
import { isOwnedRecord } from "@/lib/guestbookVisit";
import { requireSpaceUnlock } from "@/lib/spaceUnlock";
import { isAdmin } from "@/lib/admin";
import RecommendationCard from "./RecommendationCard";

/* ── 방문 완료·추천 페이지 ────────────────────────────────────
   방명록 캔버스에서 "이번 경험 마치기"를 눌렀을 때만 도달한다. 포스트잇을
   썼든 안 썼든 이번 방문(recordId)에 대한 취향 업데이트·추천·다음 이야기
   예고를 한 화면에 보여준다 — 추천 전용 페이지가 아니라 "이번 방문을
   정리하고 다음 경험으로 연결하는" 페이지. 이 화면은 결과를 보여줄 뿐
   아무것도 새로 저장하지 않는다(추천 재계산은 매번 해도 안전, 부작용 없음). ──*/

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ recordId?: string }>;
}

export const metadata: Metadata = {
  title: "방문 완료 — 공간큐브",
};

export default async function VisitCompletePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { recordId } = await searchParams;

  const session = await auth();
  if (!session?.user?.email) redirect(`/login?callbackUrl=${encodeURIComponent(`/space/${slug}/complete${recordId ? `?recordId=${recordId}` : ""}`)}`);

  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  if (!space) notFound();

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) notFound();

  // recordId는 반드시 로그인 사용자 · 이 공간의 Record여야 한다 — 다른 사용자/다른 공간의
  // recordId로는 절대 조회되지 않는다(권한 조작 방어). 값이 없거나 조건에 안 맞으면 404.
  if (!recordId) notFound();
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    select: { id: true, userId: true, spaceId: true },
  });
  if (!record || !isOwnedRecord(record, user.id, space.id)) notFound();

  // Record는 이제 SpaceUnlock 없이는 생성될 수 없지만(방어선), 이 페이지도 독립적으로
  // 한 번 더 확인한다 — 보호 경로는 각자 서버에서 재검증한다는 원칙을 그대로 따른다.
  const bypass = isAdmin(session.user.email) || (!!space.ownerId && space.ownerId === user.id);
  if (!bypass && !(await requireSpaceUnlock(user.id, space.id))) notFound();

  // 이번 방문에서 포스트잇을 남겼는지 — "사용자가 이 공간에 흔적을 하나라도 가지고 있는지"가
  // 아니라, 이번 Record와 정확히 연결된 GuestbookNote가 있는지로 판정한다.
  const noteThisVisit = await prisma.guestbookNote.findFirst({
    where: { recordId: record.id },
    select: { id: true },
  });
  const wroteThisVisit = !!noteThisVisit;

  // 추천/취향 업데이트 요약은 기존 buildRewardSummary(= buildWeightedTasteVector →
  // getLatestRecordPerSpace 최신 점수 정책)를 그대로 재사용한다 — 새 계산 로직 없음.
  const summary = await buildRewardSummary(user.id, space.id);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 / COMPLETE</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      {/* 1. 방문 완료 메시지 — 작성 여부에 따라 문구만 갈린다 */}
      <div className="space-y-2">
        {wroteThisVisit ? (
          <>
            <p className="text-xl font-bold leading-snug whitespace-pre-line">
              {"당신의 흔적이\n이 공간에 남았습니다."}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
              이번 기록으로 당신의 취향이 조금 더 선명해졌어요.
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold leading-snug whitespace-pre-line">
              {"이번 공간의 취향을\n저장했습니다."}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
              흔적을 남기지 않아도 당신의 취향에는 반영되었어요.
            </p>
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 2. 취향 업데이트 */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>취향 업데이트</p>
        <p className="text-sm leading-relaxed">당신의 취향이 업데이트되었습니다.</p>
        {summary.topTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {summary.topTags.map((t) => (
              <span key={t.label} className="text-xs px-2.5 py-1 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                {t.label}
              </span>
            ))}
          </div>
        )}
        {summary.tasteHighlight && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{summary.tasteHighlight}</p>
        )}
      </div>

      {/* 3. 추천 공간 — 공간 상세 정보는 최소화하고, 잠금 상태에 따라 상세 이동/위치 안내로 분기 */}
      {summary.recommendations.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>당신과 잘 맞을 다음 공간</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summary.recommendations.map((r) => (
                <RecommendationCard key={r.id} rec={r} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* 4. 다음 Episode 예고 */}
      {summary.nextEpisode && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>다음 이야기</p>
            {summary.nextEpisode.title ? (
              <>
                <p className="text-sm leading-relaxed">다음 방문에 새로운 이야기가 열립니다.</p>
                <p className="text-base font-medium leading-relaxed">&ldquo;{summary.nextEpisode.title}&rdquo;</p>
              </>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>다음 이야기를 준비하고 있습니다.</p>
            )}
          </div>
        </>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 5. 다음 행동 CTA — 너무 많이 강조하지 않는다, 메인 CTA 하나만 */}
      <div className="flex flex-col gap-3">
        {summary.recommendations.length > 0 ? (
          <Link
            href="/discover"
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            추천 공간 둘러보기
          </Link>
        ) : (
          <Link
            href="/archive"
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            내 아카이브 보기
          </Link>
        )}
        <div className="flex items-center justify-center gap-4">
          {summary.recommendations.length > 0 && (
            <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>내 아카이브 보기</Link>
          )}
          <Link href={`/space/${space.slug}`} className="text-xs" style={{ color: "var(--dim)" }}>이 공간으로 돌아가기</Link>
        </div>
      </div>
    </main>
  );
}
