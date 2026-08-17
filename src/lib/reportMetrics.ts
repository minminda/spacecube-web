import { prisma } from "@/lib/prisma";
import { getAdminUserIds } from "@/lib/kpiEligibility";

/* ── 리포트 확장 지표 ────────────────────────────────────────────────
   태그 기반 KPI(방문자 취향 TOP3/공간 사용 방식)를 대체하는 새 리포트 구조가 필요로 하는
   지표만 모아둔다. 기존 computePeriodStats/getSpaceMonthlyKpi(kpi.ts)는 건드리지 않고
   그대로 재사용하며, 여기 지표는 그 옆에 나란히 합쳐서 쓴다. ─────────────────────── */

export interface TasteScoreBucket {
  score: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface ExtendedPeriodStats {
  qrScans: number; // 원시 QR 스캔 수(SpaceScan, 로그인 여부 무관)
  episodeViews: number; // 기간 내 최초 열람된 Episode 수(EpisodeRead.openedAt 기준)
  episodeCompletions: number; // 위 조회 중 마지막 섹션까지 스크롤해 완독으로 기록된 수(EpisodeRead.completedAt not null)
  avgReadDurationMs: number | null; // 기간 내 스토리 페이지 평균 체류시간(ms), 표본 없으면 null
  newlyUnlockedEpisodes: number; // 기간 내 방문으로 새로 해제된 Episode 수
  reactionsTotal: number; // 기간 내 작성된 포스트잇에 달린 공감 총합
  tasteScoreDistribution: TasteScoreBucket[]; // 1~5점 분포
}

/**
 * 순수 함수 — 별도의 "Episode 해제" 이벤트 로그가 없으므로, 방문 이력(Record)과 각
 * Episode의 unlockVisitCount에서 역산한다. src/lib/episodeState.ts의 NEWLY_UNLOCKED
 * 판정(unlockVisitCount === 그 시점까지의 누적 방문 횟수)과 동일한 기준을 재사용 —
 * 사용자의 N번째 방문이 기간 안에 있고, 그 N이 어떤 Episode의 unlockVisitCount와
 * 일치하면 그 방문이 해당 Episode를 새로 해제한 것으로 센다(같은 임계값을 공유하는
 * Episode가 여러 개면 그만큼 여러 번 센다).
 */
export function countNewlyUnlockedEpisodes(
  records: { userId: string; visitedAt: Date }[],
  episodeUnlockThresholds: number[],
  periodStart: Date,
  periodEnd: Date,
): number {
  const thresholdCounts = new Map<number, number>();
  for (const t of episodeUnlockThresholds) {
    thresholdCounts.set(t, (thresholdCounts.get(t) ?? 0) + 1);
  }

  const byUser = new Map<string, Date[]>();
  for (const r of records) {
    const list = byUser.get(r.userId) ?? [];
    list.push(r.visitedAt);
    byUser.set(r.userId, list);
  }

  let count = 0;
  for (const visitDates of byUser.values()) {
    const sorted = [...visitDates].sort((a, b) => a.getTime() - b.getTime());
    sorted.forEach((visitedAt, i) => {
      const visitNumber = i + 1;
      if (visitedAt >= periodStart && visitedAt < periodEnd) {
        count += thresholdCounts.get(visitNumber) ?? 0;
      }
    });
  }
  return count;
}

/** 순수 함수 — Record.tasteScore(1~5, null 가능)를 점수별 개수로 집계한다. */
export function buildTasteScoreDistribution(records: { tasteScore: number | null }[]): TasteScoreBucket[] {
  const counts = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  for (const r of records) {
    if (r.tasteScore != null && counts.has(r.tasteScore)) {
      counts.set(r.tasteScore, (counts.get(r.tasteScore) ?? 0) + 1);
    }
  }
  return [1, 2, 3, 4, 5].map((score) => ({ score: score as 1 | 2 | 3 | 4 | 5, count: counts.get(score) ?? 0 }));
}

/**
 * 공간 하나의 확장 지표를 원본 테이블(SpaceScan/EpisodeRead/Record/GuestbookReaction)에서 계산한다.
 * 관리자 계정의 방문/공감은 제외한다. EpisodeRead(스토리 조회/완독/체류시간)는 애초에 관리자
 * 세션이면 기록 자체가 안 생기므로(episodes/[episodeId]/page.tsx, episode-reads/finish route
 * 참고) 여기서 별도로 걸러낼 필요가 없다. qrScans(SpaceScan, 원시 QR 스캔)만 예외 — 이 테이블은
 * userId가 없어(로그인 전에도 스캔이 발생) 관리자 스캔을 구분할 방법이 현재 없다.
 */
export async function getExtendedPeriodStats(
  spaceId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<ExtendedPeriodStats> {
  const adminUserIds = await getAdminUserIds();
  const notAdmin = { notIn: [...adminUserIds] };
  const [qrScans, episodeViews, episodeCompletions, durationAgg, episodes, allRecords, periodRecords, reactionsTotal] = await Promise.all([
    prisma.spaceScan.count({ where: { spaceId, scannedAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.episodeRead.count({ where: { episode: { spaceId }, openedAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.episodeRead.count({
      where: { episode: { spaceId }, openedAt: { gte: periodStart, lt: periodEnd }, completedAt: { not: null } },
    }),
    prisma.episodeRead.aggregate({
      where: { episode: { spaceId }, openedAt: { gte: periodStart, lt: periodEnd }, durationMs: { not: null } },
      _avg: { durationMs: true },
    }),
    prisma.episode.findMany({ where: { spaceId, published: true }, select: { unlockVisitCount: true } }),
    prisma.record.findMany({ where: { spaceId, userId: notAdmin }, select: { userId: true, visitedAt: true } }),
    prisma.record.findMany({
      where: { spaceId, visitedAt: { gte: periodStart, lt: periodEnd }, userId: notAdmin },
      select: { tasteScore: true },
    }),
    prisma.guestbookReaction.count({
      where: { post: { spaceId, createdAt: { gte: periodStart, lt: periodEnd } }, userId: notAdmin },
    }),
  ]);

  const newlyUnlockedEpisodes = countNewlyUnlockedEpisodes(
    allRecords,
    episodes.map((e) => e.unlockVisitCount),
    periodStart,
    periodEnd,
  );
  const tasteScoreDistribution = buildTasteScoreDistribution(periodRecords);
  const avgReadDurationMs = durationAgg._avg.durationMs != null ? Math.round(durationAgg._avg.durationMs) : null;

  return { qrScans, episodeViews, episodeCompletions, avgReadDurationMs, newlyUnlockedEpisodes, reactionsTotal, tasteScoreDistribution };
}
