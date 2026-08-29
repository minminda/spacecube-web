import { prisma } from "@/lib/prisma";
import { getAdminUserIds } from "@/lib/kpiEligibility";
import { buildHourlyTrend } from "@/lib/reportDateRange";

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
  episodeViews: number; // 기간 내 최초 열람된 Episode 수(EpisodeRead.openedAt 기준, 로그인/비로그인 방문자 모두 포함)
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
 * 관리자 계정의 방문/공감은 제외한다. EpisodeRead(스토리 조회/완독/체류시간)는 애초에 로그인한
 * 관리자 세션이면 기록 자체가 안 생기므로(episodes/[episodeId]/page.tsx, episode-reads/view,
 * episode-reads/finish route 참고) 여기서 별도로 걸러낼 필요가 없다. 단, 관리자가 로그아웃한
 * 채로 QR을 스캔해 비로그인 방문자로 잡히는 경우는 이메일로 식별할 방법이 없어 제외하지
 * 못한다(fingerprinting 없이는 해결 불가능한 구조적 한계, qrScans와 같은 종류의 제약).
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

export interface HourlyCountSet {
  hour: number; // KST 0~23
  qrScans: number;
  episodeViews: number;
  episodeCompletions: number;
  records: number;
  guestbookPosts: number;
}

/**
 * 관리자 리포트의 "시간별 조회"(하루를 선택했을 때만) — 각 지표를 날짜별 집계와 정확히 같은
 * 기준(원본 필드, 관리자 제외 여부)으로 시간대별 0건 포함 24개 버킷으로 나눈다. 시간대마다
 * DB를 24번 쏘지 않고 지표당 딱 1번(총 4번)만 범위 쿼리한 뒤 서버 메모리에서 그룹핑한다.
 *
 * "Story Complete"는 완독이 일어난 시각이 아니라, getExtendedPeriodStats의 episodeCompletions와
 * 동일하게 "그 시간대에 조회를 시작했다가(openedAt) 결국 완독까지 간 수"로 센다 — 그래야
 * 하루 전체 합계(getExtendedPeriodStats)와 시간별 합계가 모든 지표에서 정확히 일치한다.
 */
export async function getHourlyPeriodStats(spaceId: string, dayStart: Date, dayEnd: Date): Promise<HourlyCountSet[]> {
  const adminUserIds = await getAdminUserIds();
  const notAdmin = { notIn: [...adminUserIds] };

  const [scans, reads, records, notes] = await Promise.all([
    prisma.spaceScan.findMany({ where: { spaceId, scannedAt: { gte: dayStart, lt: dayEnd } }, select: { scannedAt: true } }),
    prisma.episodeRead.findMany({
      where: { episode: { spaceId }, openedAt: { gte: dayStart, lt: dayEnd } },
      select: { openedAt: true, completedAt: true },
    }),
    prisma.record.findMany({ where: { spaceId, visitedAt: { gte: dayStart, lt: dayEnd }, userId: notAdmin }, select: { visitedAt: true } }),
    prisma.guestbookNote.findMany({ where: { spaceId, createdAt: { gte: dayStart, lt: dayEnd }, userId: notAdmin }, select: { createdAt: true } }),
  ]);

  const qrBuckets = buildHourlyTrend(scans.map((s) => s.scannedAt), dayStart, dayEnd);
  const viewBuckets = buildHourlyTrend(reads.map((r) => r.openedAt), dayStart, dayEnd);
  const completeBuckets = buildHourlyTrend(reads.filter((r) => r.completedAt != null).map((r) => r.openedAt), dayStart, dayEnd);
  const recordBuckets = buildHourlyTrend(records.map((r) => r.visitedAt), dayStart, dayEnd);
  const guestbookBuckets = buildHourlyTrend(notes.map((n) => n.createdAt), dayStart, dayEnd);

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    qrScans: qrBuckets[hour]?.count ?? 0,
    episodeViews: viewBuckets[hour]?.count ?? 0,
    episodeCompletions: completeBuckets[hour]?.count ?? 0,
    records: recordBuckets[hour]?.count ?? 0,
    guestbookPosts: guestbookBuckets[hour]?.count ?? 0,
  }));
}

/**
 * 방문자 전환 퍼널(§QR 진입 ~ 포스트잇 작성) — 관리자가 "어느 구간에서 이탈했는지" 진단하는
 * 화면 전용 지표. 이 함수의 모든 필드는 반드시 "그 단계까지 도달한 고유 방문자 수"(중복
 * 제거, 명 단위)로 통일한다 — 옆 함수들의 qrScans("회", 원시 스캔 이벤트 수)나
 * episodeViews("회", 조회 이벤트 수, 같은 방문자가 이 공간의 Episode를 여러 개 열면 여러 번
 * 잡힘)와는 다른 집계 단위이므로 절대 섞어 쓰지 않는다 — 두 종류를 같은 화면에 같이 쓸 때는
 * 라벨/단위로 반드시 구분한다(관리자 리포트 화면 참고).
 *
 * - qrEntrants: SpaceScan distinct(userId ?? anonId). anonId는 2026-08-29 이후 스캔부터만
 *   채워진다(그 전 스캔은 로그인한 경우만 식별 가능) — 계측 시작 이전 기간을 조회하면
 *   과소집계될 수 있다.
 * - storyViewers/storyCompleters: EpisodeRead distinct(userId ?? anonId). 공간에 Episode가
 *   여러 개면 한 사람이 여러 행을 만들 수 있어 raw count(episodeViews)보다 항상 작거나 같다.
 * - entryAttempts/loginRequired/loginSuccess/writeAttempts: GuestbookFunnelEvent는 이미
 *   방문자당 스텝별 최초 1회만 기록되므로(guestbookFunnel.ts) count 자체가 고유 인원이다.
 * - recordCompleters: Record distinct(userId) — kpi.ts의 "QR 이용자"와 정의가 완전히
 *   같다(같은 데이터를 퍼널 관점에서 다시 부르는 것일 뿐, 별도 계산 아님).
 * - guestbookViewers: Record.guestbookViewedAt distinct(userId) — 실제로 방명록 캔버스에
 *   도달한 사람. ENTRY_ATTEMPT(방명록 방향으로 이동을 "시도"함)와 반드시 구분해서 써야 한다.
 * - postItAuthors: GuestbookNote distinct(userId) — kpi.ts의 "작성자 수"와 동일 정의.
 *
 * 관리자 제외 시 주의: userId가 nullable인 테이블(SpaceScan/EpisodeRead/GuestbookFunnelEvent)은
 * `userId: { notIn: [...] }`만 쓰면 SQL이 `NULL NOT IN (...)`을 거짓으로 평가해 익명 행까지
 * 걸러버린다 — distinct 집계가 필요한 SpaceScan/EpisodeRead는 행을 그대로 가져와 JS에서
 * admin userId만 골라 제외하고, GuestbookFunnelEvent는 기존과 같이 OR 절로 명시한다.
 */
export interface GuestbookConversionFunnel {
  qrEntrants: number;
  storyViewers: number;
  storyCompleters: number;
  entryAttempts: number;
  loginRequired: number;
  loginSuccess: number;
  recordCompleters: number;
  guestbookViewers: number;
  writeAttempts: number;
  postItAuthors: number;
}

export async function getGuestbookConversionFunnel(
  spaceId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<GuestbookConversionFunnel> {
  const adminUserIds = await getAdminUserIds();
  const adminSet = new Set(adminUserIds);
  const notAdmin = { notIn: [...adminUserIds] };
  const notAdminOrAnonymous = { OR: [{ userId: null }, { userId: { notIn: [...adminUserIds] } }] };

  const identity = (row: { userId: string | null; anonId?: string | null }): string | null =>
    row.userId ?? (row.anonId ? `anon:${row.anonId}` : null);
  const distinctCount = (rows: { userId: string | null; anonId?: string | null }[]): number =>
    new Set(rows.map(identity).filter((v): v is string => v != null)).size;

  const [scans, reads, entryAttempts, loginRequired, loginSuccess, writeAttempts, records, guestbookViews, notes] =
    await Promise.all([
      prisma.spaceScan.findMany({
        where: { spaceId, scannedAt: { gte: periodStart, lt: periodEnd } },
        select: { userId: true, anonId: true },
      }),
      prisma.episodeRead.findMany({
        where: { episode: { spaceId }, openedAt: { gte: periodStart, lt: periodEnd } },
        select: { userId: true, anonId: true, completedAt: true },
      }),
      prisma.guestbookFunnelEvent.count({
        where: { spaceId, step: "ENTRY_ATTEMPT", createdAt: { gte: periodStart, lt: periodEnd }, ...notAdminOrAnonymous },
      }),
      prisma.guestbookFunnelEvent.count({
        where: { spaceId, step: "LOGIN_REQUIRED", createdAt: { gte: periodStart, lt: periodEnd } },
      }),
      prisma.guestbookFunnelEvent.count({
        where: { spaceId, step: "LOGIN_SUCCESS", createdAt: { gte: periodStart, lt: periodEnd }, ...notAdminOrAnonymous },
      }),
      prisma.guestbookFunnelEvent.count({
        where: { spaceId, step: "WRITE_ATTEMPT", createdAt: { gte: periodStart, lt: periodEnd }, ...notAdminOrAnonymous },
      }),
      prisma.record.findMany({
        where: { spaceId, visitedAt: { gte: periodStart, lt: periodEnd }, userId: notAdmin },
        select: { userId: true },
      }),
      prisma.record.findMany({
        where: { spaceId, guestbookViewedAt: { gte: periodStart, lt: periodEnd }, userId: notAdmin },
        select: { userId: true },
      }),
      prisma.guestbookNote.findMany({
        where: { spaceId, createdAt: { gte: periodStart, lt: periodEnd }, userId: notAdmin },
        select: { userId: true },
      }),
    ]);

  const nonAdminScans = scans.filter((s) => !(s.userId && adminSet.has(s.userId)));
  const nonAdminReads = reads.filter((r) => !(r.userId && adminSet.has(r.userId)));

  return {
    qrEntrants: distinctCount(nonAdminScans),
    storyViewers: distinctCount(nonAdminReads),
    storyCompleters: distinctCount(nonAdminReads.filter((r) => r.completedAt != null)),
    entryAttempts,
    loginRequired,
    loginSuccess,
    recordCompleters: new Set(records.map((r) => r.userId)).size,
    guestbookViewers: new Set(guestbookViews.map((r) => r.userId)).size,
    writeAttempts,
    postItAuthors: new Set(notes.map((n) => n.userId)).size,
  };
}
