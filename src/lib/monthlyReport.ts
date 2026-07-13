import { prisma } from "@/lib/prisma";
import { Prisma, MonthlyReportStatus } from "@prisma/client";
import { getSpaceMonthlyKpi, type PeriodKpiStats } from "@/lib/kpi";

// 규칙형 요약 임계값 — 태그 기반이 아니라 실제 KPI 수치 기반. AI 호출 없음, 순수 함수라 테스트 가능.
const MIN_SAMPLE_QR_USERS = 5;
const HIGH_TASTE_SCORE = 4.0;
const HIGH_REVISIT_RATE = 0.25;
const HIGH_GUESTBOOK_RATE = 0.35;

/**
 * 공간 사용 방식을 규칙 기반 문장으로 요약한다(kpi.ts의 태그 기반 generateSpaceUsageSummary와는 별개 —
 * 월간 리포트는 태그 TOP3/키워드를 쓰지 않기로 스펙에서 명시했기 때문에 새로 분리했다).
 * 우선순위: 표본 부족 → 취향 적합도 → 재방문율 → 방명록 작성률 → 기본 문장.
 */
export function getMonthlyUsageSummary(stats: PeriodKpiStats): string {
  if (stats.qrUsers < MIN_SAMPLE_QR_USERS) {
    return "아직 공간을 해석하기 위한 기록이 충분하지 않습니다.";
  }
  if (stats.averageTasteScore != null && stats.averageTasteScore >= HIGH_TASTE_SCORE) {
    return "방문자들이 이 공간과 높은 취향 적합도를 느끼고 있습니다.";
  }
  if (stats.revisitRate >= HIGH_REVISIT_RATE) {
    return "한 번 방문한 뒤 다시 찾는 이용자가 많은 공간입니다.";
  }
  if (stats.guestbookRate >= HIGH_GUESTBOOK_RATE) {
    return "방문자들이 자신의 경험을 적극적으로 남기고 있습니다.";
  }
  return "방문자들이 저마다의 방식으로 이 공간을 경험하고 있습니다.";
}

export interface FeaturedPostCandidate {
  id: string;
  createdAt: Date;
  reactionCount: number;
}

/**
 * 공감 TOP3를 선정한다. 공감 0개인 글은 억지로 TOP3에 넣지 않는다(전부 0개면 빈 배열).
 * 정렬: 공감 수 내림차순, 동률이면 작성일 빠른 순.
 */
export function selectTopFeaturedPosts(notes: FeaturedPostCandidate[], limit = 3): FeaturedPostCandidate[] {
  return [...notes]
    .filter((n) => n.reactionCount > 0)
    .sort((a, b) => b.reactionCount - a.reactionCount || a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, limit);
}

/**
 * 해당 구간의 월간 리포트를 확정된 스냅샷으로 생성하거나(이미 있으면) 그대로 반환한다.
 * @@unique([spaceId, periodStart])로 중복 생성을 막고, 동시 요청 경쟁은 P2002를 잡아 기존 행을 반환해 idempotent하게 만든다.
 */
export async function generateOrGetMonthlyReport(spaceId: string, periodStart: Date, periodEnd: Date) {
  const existing = await prisma.spaceMonthlyReport.findUnique({
    where: { spaceId_periodStart: { spaceId, periodStart } },
  });
  if (existing) return existing;

  const stats = await getSpaceMonthlyKpi(spaceId, periodStart, periodEnd);
  const usageSummary = getMonthlyUsageSummary(stats);

  const notes = await prisma.guestbookNote.findMany({
    where: { spaceId, createdAt: { gte: periodStart, lt: periodEnd } },
    select: { id: true, createdAt: true, _count: { select: { reactions: true } } },
  });
  const candidates: FeaturedPostCandidate[] = notes.map((n) => ({
    id: n.id,
    createdAt: n.createdAt,
    reactionCount: n._count.reactions,
  }));
  const top = selectTopFeaturedPosts(candidates);

  try {
    return await prisma.$transaction(async (tx) => {
      const report = await tx.spaceMonthlyReport.create({
        data: {
          spaceId,
          periodStart,
          periodEnd,
          status: MonthlyReportStatus.PUBLISHED,
          publishedAt: new Date(),
          qrUsers: stats.qrUsers,
          returningUsers: stats.returningUsers,
          revisitRate: stats.revisitRate,
          guestbookWriters: stats.guestbookWriters,
          guestbookPosts: stats.guestbookPosts,
          guestbookRate: stats.guestbookRate,
          averageTasteScore: stats.averageTasteScore,
          usageSummary,
        },
      });
      if (top.length > 0) {
        await tx.monthlyReportFeaturedPost.createMany({
          data: top.map((t, i) => ({
            monthlyReportId: report.id,
            guestbookNoteId: t.id,
            rank: i + 1,
            reactionCount: t.reactionCount,
          })),
        });
      }
      return report;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const created = await prisma.spaceMonthlyReport.findUnique({
        where: { spaceId_periodStart: { spaceId, periodStart } },
      });
      if (created) return created;
    }
    throw err;
  }
}
