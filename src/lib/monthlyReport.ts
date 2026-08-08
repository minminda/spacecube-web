import { prisma } from "@/lib/prisma";
import { Prisma, MonthlyReportStatus, type ClusterType } from "@prisma/client";
import { getSpaceMonthlyKpi, type PeriodKpiStats } from "@/lib/kpi";
import { getExtendedPeriodStats, type ExtendedPeriodStats } from "@/lib/reportMetrics";

/* ── 월간 리포트 콘텐츠 조립 ────────────────────────────────────────────
   ReportEmail.tsx(관리자 Preview + 메일 렌더링 공용 컴포넌트)이 그대로 소비하는
   ReportEmailData 하나로 귀결된다. 두 가지 입구가 있다:
   1) computeMonthlyReportContent — 아직 끝나지 않은 "이번 달" 진행 중 구간을 매번
      원본 테이블에서 라이브로 계산한다(관리자 페이지의 "리포트 미리보기"용).
   2) generateOrGetMonthlyReport — 끝난 구간을 확정 스냅샷(SpaceMonthlyReport)으로
      한 번만 계산해 저장하고, buildReportEmailDataFromStored로 그 스냅샷을 그대로
      복원한다("이전 리포트"용) — 이후 원본 데이터가 바뀌어도(공감이 늘어나도) 값이
      바뀌지 않는다는 기존 원칙을 유지한다. ────────────────────────────────── */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstMonth(date: Date): number {
  return new Date(date.getTime() + KST_OFFSET_MS).getUTCMonth() + 1;
}

/** "7월"처럼 표시용 월 라벨을 만든다(KST 기준). */
export function formatPeriodLabel(periodStart: Date): string {
  return `${kstMonth(periodStart)}월`;
}

// 규칙형 요약 임계값 — 태그 기반이 아니라 실제 KPI 수치 기반. AI 호출 없음, 순수 함수라 테스트 가능.
const MIN_SAMPLE_QR_USERS = 5;
const HIGH_TASTE_SCORE = 4.0;
const HIGH_REVISIT_RATE = 0.25;
const HIGH_GUESTBOOK_RATE = 0.35;

/**
 * 공간 사용 방식을 규칙 기반 문장으로 요약한다(태그 TOP3/키워드를 쓰지 않는다 — 리포트
 * 스펙에서 명시). "① 한눈에 보기"의 마무리 문장과 "⑥ 공간 경험 요약"에서 공유해서 쓴다.
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

/** "① 이번 기간 한눈에 보기" 본문 — 방문/재방문 수치 문장 + 공간 사용 방식 요약.
 *  "이번 달"로 고정하지 않는다 — 파일럿에서는 관리자가 오늘/최근 7일처럼 임의 기간을 골라
 *  이 리포트를 만들 수 있어(관리자 KPI 자유 기간 조회와 동일 기간을 그대로 씀), 월 단위가
 *  아닌 기간에도 사실과 어긋나지 않는 "이번 기간"이라는 중립적 표현을 쓴다. */
export function buildHeadline(stats: PeriodKpiStats, usageSummary: string): string {
  const visitLine =
    stats.qrUsers > 0
      ? `이번 기간 ${stats.qrUsers}명이 공간을 방문했고, ${stats.returningUsers}명이 다시 찾아왔습니다.`
      : "이번 기간은 아직 방문 기록이 충분하지 않습니다.";
  return `${visitLine} 방문자들은 ${usageSummary}`;
}

function pctPointDelta(before: number, after: number): string {
  const diffPoints = Math.round((after - before) * 100);
  if (diffPoints === 0) return "전월과 동일";
  return `전월 대비 ${diffPoints > 0 ? "+" : ""}${diffPoints}%p`;
}

function countPercentDelta(before: number, after: number): string {
  if (before === 0) return after === 0 ? "전월과 동일" : "신규";
  const diffPct = Math.round(((after - before) / before) * 100);
  if (diffPct === 0) return "전월과 동일";
  return `전월 대비 ${diffPct > 0 ? "+" : ""}${diffPct}%`;
}

function scoreDelta(before: number | null, after: number | null): string {
  if (before == null || after == null) return "비교 불가";
  const diff = Math.round((after - before) * 10) / 10;
  if (diff === 0) return "전월과 동일";
  return `전월 대비 ${diff > 0 ? "+" : ""}${diff}점`;
}

function direction(before: number, after: number): "up" | "down" | "flat" {
  if (after > before) return "up";
  if (after < before) return "down";
  return "flat";
}

/** ms를 "2분 15초" / "45초" 형태로 표시한다. */
export function formatDurationLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes === 0 ? `${seconds}초` : `${minutes}분 ${seconds}초`;
}

export interface ReportKpiCard {
  key: string;
  label: string;
  value: string;
  change: { direction: "up" | "down" | "flat"; deltaLabel: string } | null;
}

/** "② 핵심 KPI" 카드 6개 — QR 이용자 / 재방문자 / 재방문율 / 방명록 포스트잇 / 방명록 작성률 /
 *  평균 취향 적합도, 전월 대비 포함(previous가 없으면 change는 전부 null). 방명록 작성자 수는
 *  방명록 작성률과 사실상 같은 정보를 다른 각도로 보여줄 뿐이라 카드를 늘리지 않고 뺐다
 *  (파일럿 리포트 요청의 "중복되거나 의미가 약한 지표는 최소화" 원칙). "방문 Record 수"(총
 *  방문 건수, distinct 사용자와 별개)는 현재 KPI 구조 어디에도 계산되어 있지 않아 새로 정의를
 *  만들지 않기 위해 포함하지 않았다 — 필요하면 별도 승인 후 추가할 것. */
export function buildKpiCards(stats: PeriodKpiStats, previous: PeriodKpiStats | null): ReportKpiCard[] {
  return [
    {
      key: "qrUsers",
      label: "QR 이용자",
      value: `${stats.qrUsers}명`,
      change: previous
        ? { direction: direction(previous.qrUsers, stats.qrUsers), deltaLabel: countPercentDelta(previous.qrUsers, stats.qrUsers) }
        : null,
    },
    {
      key: "returningUsers",
      label: "재방문자",
      value: `${stats.returningUsers}명`,
      change: previous
        ? { direction: direction(previous.returningUsers, stats.returningUsers), deltaLabel: countPercentDelta(previous.returningUsers, stats.returningUsers) }
        : null,
    },
    {
      key: "revisitRate",
      label: "재방문율",
      value: `${Math.round(stats.revisitRate * 100)}%`,
      change: previous
        ? { direction: direction(previous.revisitRate, stats.revisitRate), deltaLabel: pctPointDelta(previous.revisitRate, stats.revisitRate) }
        : null,
    },
    {
      key: "guestbookPosts",
      label: "방명록 포스트잇",
      value: `${stats.guestbookPosts}개`,
      change: previous
        ? { direction: direction(previous.guestbookPosts, stats.guestbookPosts), deltaLabel: countPercentDelta(previous.guestbookPosts, stats.guestbookPosts) }
        : null,
    },
    {
      key: "guestbookRate",
      label: "방명록 작성률",
      value: `${Math.round(stats.guestbookRate * 100)}%`,
      change: previous
        ? { direction: direction(previous.guestbookRate, stats.guestbookRate), deltaLabel: pctPointDelta(previous.guestbookRate, stats.guestbookRate) }
        : null,
    },
    {
      key: "averageTasteScore",
      label: "평균 취향 적합도",
      value: stats.averageTasteScore != null ? `${stats.averageTasteScore.toFixed(1)}/5` : "—",
      change: previous
        ? {
            direction: direction(previous.averageTasteScore ?? 0, stats.averageTasteScore ?? 0),
            deltaLabel: scoreDelta(previous.averageTasteScore, stats.averageTasteScore),
          }
        : null,
    },
  ];
}

export interface StoryReadStats {
  episodeViews: number;
  episodeCompletions: number;
  avgReadDurationMs: number | null;
}

/**
 * "공간 이야기" 카드 3개 — 스토리 조회 / 완독률 / 평균 체류시간. 나머지 KPI 카드와 같은
 * ReportKpiCard 형태라 ReportEmail.tsx에서 동일한 표(KpiCardGrid)로 렌더된다. 체류시간은
 * 표본이 작을 때 전월 대비 등락이 노이즈에 가까워 델타를 만들지 않는다(최소 계측 원칙).
 */
export function buildStoryCards(current: StoryReadStats, previous: StoryReadStats | null): ReportKpiCard[] {
  const completionRate = current.episodeViews > 0 ? current.episodeCompletions / current.episodeViews : null;
  const previousCompletionRate =
    previous && previous.episodeViews > 0 ? previous.episodeCompletions / previous.episodeViews : null;

  return [
    {
      key: "storyViews",
      label: "스토리 조회",
      value: `${current.episodeViews}회`,
      change: previous
        ? { direction: direction(previous.episodeViews, current.episodeViews), deltaLabel: countPercentDelta(previous.episodeViews, current.episodeViews) }
        : null,
    },
    {
      key: "storyCompletionRate",
      label: "스토리 완독률",
      value: completionRate != null ? `${Math.round(completionRate * 100)}%` : "—",
      change:
        completionRate != null && previousCompletionRate != null
          ? { direction: direction(previousCompletionRate, completionRate), deltaLabel: pctPointDelta(previousCompletionRate, completionRate) }
          : null,
    },
    {
      key: "avgReadDuration",
      label: "평균 체류시간",
      value: current.avgReadDurationMs != null ? formatDurationLabel(current.avgReadDurationMs) : "—",
      change: null,
    },
  ];
}

/**
 * "③ 이번 달 변화" — 전월 대비 가장 두드러진 변화 최대 2개를 규칙 기반 문장으로 만든다.
 * AI 생성이 아니라 임계값(5%p/10%/0.3점) 이상 변화만 후보로 삼고, 변화 폭이 큰 순으로 고른다.
 */
export function buildChangeInsights(current: PeriodKpiStats, previous: PeriodKpiStats | null): string[] {
  if (!previous || previous.qrUsers === 0) return [];
  const insights: { priority: number; text: string }[] = [];

  const revisitDeltaPct = previous.revisitRate === 0 ? 0 : Math.round(((current.revisitRate - previous.revisitRate) / previous.revisitRate) * 100);
  if (Math.abs(current.revisitRate - previous.revisitRate) * 100 >= 5) {
    insights.push({
      priority: Math.abs(revisitDeltaPct) || 10,
      text:
        current.revisitRate > previous.revisitRate
          ? `재방문율이 지난달보다 늘었습니다. 공간을 다시 찾는 방문자가 늘고 있습니다.`
          : `재방문율이 지난달보다 줄었습니다. 다시 방문하고 싶어지는 이유를 점검해보세요.`,
    });
  }

  if (Math.abs(current.guestbookRate - previous.guestbookRate) * 100 >= 5) {
    insights.push({
      priority: Math.abs(current.guestbookRate - previous.guestbookRate) * 100,
      text:
        current.guestbookRate > previous.guestbookRate
          ? `방명록 작성률이 지난달보다 늘었습니다. 흔적을 남기는 방문자가 늘고 있습니다.`
          : `방명록 작성률은 감소했습니다. 방문 후 흔적을 남기도록 유도하는 문구를 점검해보세요.`,
    });
  }

  if (current.averageTasteScore != null && previous.averageTasteScore != null) {
    const scoreDiff = current.averageTasteScore - previous.averageTasteScore;
    if (Math.abs(scoreDiff) >= 0.3) {
      insights.push({
        priority: Math.abs(scoreDiff) * 20,
        text:
          scoreDiff > 0
            ? `평균 취향 적합도가 지난달보다 올랐습니다. 방문자와 공간의 결이 더 잘 맞아가고 있습니다.`
            : `평균 취향 적합도가 지난달보다 내렸습니다. 최근 방문자 경험을 다시 점검해보세요.`,
      });
    }
  }

  if (previous.qrUsers > 0) {
    const qrDeltaPct = Math.round(((current.qrUsers - previous.qrUsers) / previous.qrUsers) * 100);
    if (Math.abs(qrDeltaPct) >= 10) {
      insights.push({
        priority: Math.abs(qrDeltaPct) * 0.5,
        text: qrDeltaPct > 0 ? `QR 이용자가 지난달보다 늘었습니다.` : `QR 이용자가 지난달보다 줄었습니다.`,
      });
    }
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 2).map((i) => i.text);
}

export interface ReportQuestionParticipation {
  type: "QUESTION_1" | "QUESTION_2";
  label: string;
  count: number;
  percent: number;
}

/**
 * "⑤ 질문별 참여" — 기간과 겹치는 GuestbookSession(가장 최근 것)의 질문 텍스트에, 같은 기간
 * 작성된 포스트잇을 clusterType별로 집계한 응답 수/비율을 짝짓는다. 질문 내용이 없는 군집은
 * 방문자 캔버스에도 안 나타나므로 여기서도 제외한다(getVisibleClusters와 동일한 원칙).
 */
async function getQuestionParticipation(spaceId: string, periodStart: Date, periodEnd: Date): Promise<ReportQuestionParticipation[]> {
  const [session, noteCounts] = await Promise.all([
    prisma.guestbookSession.findFirst({
      where: { spaceId, startsAt: { lt: periodEnd }, OR: [{ endsAt: null }, { endsAt: { gt: periodStart } }] },
      orderBy: { startsAt: "desc" },
      select: { question1: true, question2: true },
    }),
    prisma.guestbookNote.groupBy({
      by: ["clusterType"],
      where: { spaceId, createdAt: { gte: periodStart, lt: periodEnd } },
      _count: { _all: true },
    }),
  ]);

  const total = noteCounts.reduce((sum, c) => sum + c._count._all, 0);
  const countFor = (type: ClusterType) => noteCounts.find((c) => c.clusterType === type)?._count._all ?? 0;
  const percentFor = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  const entries: ReportQuestionParticipation[] = [];
  if (session?.question1) {
    const count = countFor("QUESTION_1");
    entries.push({ type: "QUESTION_1", label: session.question1, count, percent: percentFor(count) });
  }
  if (session?.question2) {
    const count = countFor("QUESTION_2");
    entries.push({ type: "QUESTION_2", label: session.question2, count, percent: percentFor(count) });
  }
  return entries;
}

/**
 * "⑦ 다음 달 제안" — 최대 2개. 공간큐브 데이터(질문 참여율, Episode 조회 대비 해제 수, 방명록
 * 작성률)에서만 트리거되는 규칙 기반 문장 — 운영자의 실제 공간 운영을 추측/단정하지 않는다.
 */
export function buildSuggestions(
  stats: PeriodKpiStats,
  extended: ExtendedPeriodStats,
  questionParticipation: ReportQuestionParticipation[],
): string[] {
  const candidates: { priority: number; text: string }[] = [];

  for (const q of questionParticipation) {
    if (q.count > 0 && q.percent < 25) {
      candidates.push({
        priority: 25 - q.percent,
        text: `"${q.label}" 참여율이 낮았습니다. 다음 달에는 조금 더 짧고 답하기 쉬운 질문을 사용해보세요.`,
      });
    }
  }

  if (extended.newlyUnlockedEpisodes > 0 && extended.episodeViews < extended.newlyUnlockedEpisodes) {
    candidates.push({
      priority: extended.newlyUnlockedEpisodes - extended.episodeViews,
      text: "새 Episode 해제는 많았지만 조회는 적었습니다. 새로운 이야기가 열렸다는 안내를 조금 더 강조해보세요.",
    });
  }

  if (stats.qrUsers >= MIN_SAMPLE_QR_USERS && stats.guestbookRate < 0.2) {
    candidates.push({
      priority: (0.2 - stats.guestbookRate) * 100,
      text: "방명록 작성률이 낮은 편입니다. 방문 후 흔적을 남기도록 안내를 조금 더 눈에 띄게 해보세요.",
    });
  }

  return candidates.sort((a, b) => b.priority - a.priority).slice(0, 2).map((c) => c.text);
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

export interface ReportFeaturedPost {
  content: string;
  reactionCount: number;
  clusterType: ClusterType;
}

export interface ReportEmailData {
  spaceName: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  headline: string;
  kpiCards: ReportKpiCard[];
  storyCards: ReportKpiCard[];
  changeInsights: string[];
  featuredPosts: ReportFeaturedPost[];
  questionParticipation: ReportQuestionParticipation[];
  usageSummary: string;
  suggestions: string[];
  operatorNote: string | null;
}

/**
 * 아직 끝나지 않은 구간(보통 "이번 달")을 원본 테이블에서 매번 라이브로 계산한다 — 관리자
 * 페이지의 "리포트 미리보기"용. 아직 SpaceMonthlyReport 행이 없으므로 운영 메모도 없다
 * (운영자는 실제로 발행된 리포트에만 메모를 남길 수 있다 — 기존 /operator 흐름 그대로).
 */
export async function computeMonthlyReportContent(
  spaceId: string,
  periodStart: Date,
  periodEnd: Date,
  previousStats: PeriodKpiStats | null,
  previousStoryStats: StoryReadStats | null = null,
): Promise<ReportEmailData> {
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { name: true } });

  const [stats, extended, questionParticipation, noteRows] = await Promise.all([
    getSpaceMonthlyKpi(spaceId, periodStart, periodEnd),
    getExtendedPeriodStats(spaceId, periodStart, periodEnd),
    getQuestionParticipation(spaceId, periodStart, periodEnd),
    prisma.guestbookNote.findMany({
      where: { spaceId, createdAt: { gte: periodStart, lt: periodEnd } },
      select: { id: true, content: true, clusterType: true, createdAt: true, _count: { select: { reactions: true } } },
    }),
  ]);

  const top = selectTopFeaturedPosts(noteRows.map((n) => ({ id: n.id, createdAt: n.createdAt, reactionCount: n._count.reactions })));
  const featuredPosts: ReportFeaturedPost[] = top.map((t) => {
    const note = noteRows.find((n) => n.id === t.id)!;
    return { content: note.content, reactionCount: t.reactionCount, clusterType: note.clusterType };
  });

  const usageSummary = getMonthlyUsageSummary(stats);

  return {
    spaceName: space?.name ?? "",
    periodLabel: formatPeriodLabel(periodStart),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    headline: buildHeadline(stats, usageSummary),
    kpiCards: buildKpiCards(stats, previousStats),
    storyCards: buildStoryCards(extended, previousStoryStats),
    changeInsights: buildChangeInsights(stats, previousStats),
    featuredPosts,
    questionParticipation,
    usageSummary,
    suggestions: buildSuggestions(stats, extended, questionParticipation),
    operatorNote: null,
  };
}

function toPeriodKpiStats(row: {
  qrUsers: number;
  returningUsers: number;
  revisitRate: number;
  guestbookWriters: number;
  guestbookPosts: number;
  guestbookRate: number;
  averageTasteScore: number | null;
}): PeriodKpiStats {
  return {
    qrUsers: row.qrUsers,
    returningUsers: row.returningUsers,
    revisitRate: row.revisitRate,
    guestbookWriters: row.guestbookWriters,
    guestbookPosts: row.guestbookPosts,
    guestbookRate: row.guestbookRate,
    averageTasteScore: row.averageTasteScore,
  };
}

/**
 * 해당 구간의 월간 리포트를 확정된 스냅샷으로 생성하거나(이미 있으면) 그대로 반환한다.
 * @@unique([spaceId, periodStart])로 중복 생성을 막고, 동시 요청 경쟁은 P2002를 잡아 기존 행을 반환해 idempotent하게 만든다.
 * ReportEmail.tsx가 그대로 쓸 수 있는 문장(headline/changeInsights/suggestions)과 파생 집계까지
 * 이 시점에 전부 계산해 저장한다 — 이후 원본 데이터가 바뀌어도(공감이 늘어나도) 이 리포트가 보여주는
 * 숫자·문장은 그대로 유지된다.
 */
export async function generateOrGetMonthlyReport(spaceId: string, periodStart: Date, periodEnd: Date) {
  const existing = await prisma.spaceMonthlyReport.findUnique({
    where: { spaceId_periodStart: { spaceId, periodStart } },
  });
  if (existing) return existing;

  const [stats, extended, questionParticipation, previousReport] = await Promise.all([
    getSpaceMonthlyKpi(spaceId, periodStart, periodEnd),
    getExtendedPeriodStats(spaceId, periodStart, periodEnd),
    getQuestionParticipation(spaceId, periodStart, periodEnd),
    prisma.spaceMonthlyReport.findFirst({ where: { spaceId, periodStart: { lt: periodStart } }, orderBy: { periodStart: "desc" } }),
  ]);
  const previousStats = previousReport ? toPeriodKpiStats(previousReport) : null;
  const usageSummary = getMonthlyUsageSummary(stats);
  const headline = buildHeadline(stats, usageSummary);
  const changeInsights = buildChangeInsights(stats, previousStats);
  const suggestions = buildSuggestions(stats, extended, questionParticipation);

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
          qrScans: extended.qrScans,
          episodeViews: extended.episodeViews,
          episodeCompletions: extended.episodeCompletions,
          avgReadDurationMs: extended.avgReadDurationMs,
          newlyUnlockedEpisodes: extended.newlyUnlockedEpisodes,
          reactionsTotal: extended.reactionsTotal,
          tasteScoreDistribution: extended.tasteScoreDistribution as unknown as Prisma.InputJsonValue,
          questionParticipation: questionParticipation as unknown as Prisma.InputJsonValue,
          headline,
          changeInsights: changeInsights as unknown as Prisma.InputJsonValue,
          suggestions: suggestions as unknown as Prisma.InputJsonValue,
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

/** 이미 발행된 리포트(SpaceMonthlyReport) 한 건을 ReportEmail.tsx가 쓰는 형태로 복원한다 — "이전 리포트" 열람용. */
export async function buildReportEmailDataFromStored(reportId: string): Promise<ReportEmailData | null> {
  const report = await prisma.spaceMonthlyReport.findUnique({
    where: { id: reportId },
    include: { space: { select: { name: true } } },
  });
  if (!report) return null;

  const [featuredRows, operatorNoteRow, previousReport] = await Promise.all([
    prisma.monthlyReportFeaturedPost.findMany({
      where: { monthlyReportId: report.id },
      orderBy: { rank: "asc" },
      include: { note: { select: { content: true, clusterType: true } } },
    }),
    prisma.operatorMonthlyNote.findFirst({ where: { monthlyReportId: report.id }, orderBy: { updatedAt: "desc" } }),
    prisma.spaceMonthlyReport.findFirst({
      where: { spaceId: report.spaceId, periodStart: { lt: report.periodStart } },
      orderBy: { periodStart: "desc" },
    }),
  ]);

  const previousStats = previousReport ? toPeriodKpiStats(previousReport) : null;

  return {
    spaceName: report.space.name,
    periodLabel: formatPeriodLabel(report.periodStart),
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    headline: report.headline ?? buildHeadline(toPeriodKpiStats(report), report.usageSummary),
    kpiCards: buildKpiCards(toPeriodKpiStats(report), previousStats),
    storyCards: buildStoryCards(report, previousReport),
    changeInsights: (report.changeInsights as unknown as string[] | null) ?? [],
    featuredPosts: featuredRows.map((f) => ({ content: f.note.content, reactionCount: f.reactionCount, clusterType: f.note.clusterType })),
    questionParticipation: (report.questionParticipation as unknown as ReportQuestionParticipation[] | null) ?? [],
    usageSummary: report.usageSummary,
    suggestions: (report.suggestions as unknown as string[] | null) ?? [],
    operatorNote: operatorNoteRow?.content ?? null,
  };
}
