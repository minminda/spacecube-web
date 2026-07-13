import { prisma } from "@/lib/prisma";
import { TAG_LABELS } from "@/lib/tags";
import { aggregateSpaceTags, getSpaceUsageSummary } from "@/lib/spaceInsight";
import { Prisma, type TagKey } from "@prisma/client";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 오늘 00:00 ~ 내일 00:00 범위와, DB에 저장할 날짜(자정 UTC로 표현된 KST 날짜)를 반환한다. */
function kstDayRange(base: Date) {
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0) - KST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - KST_OFFSET_MS);
  const dateOnly = new Date(Date.UTC(y, m, d));
  return { start, end, dateOnly };
}

/** KST 기준 이번 달 1일 00:00 을 반환한다. */
function kstMonthStart(base: Date) {
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  return new Date(Date.UTC(y, m, 1, 0, 0, 0) - KST_OFFSET_MS);
}

export interface TopTagEntry {
  tag: TagKey;
  label: string;
  count: number;
}

/**
 * 공간 사용 방식을 규칙 기반 문장으로 요약한다.
 * 현재는 규칙 기반(getSpaceUsageSummary)이지만, 추후 AI 요약으로 교체할 때
 * 이 함수의 내부 구현만 바꾸면 되도록 호출부와 분리해뒀다.
 */
export function generateSpaceUsageSummary(topTags: [TagKey, number][]): string | null {
  return getSpaceUsageSummary(topTags);
}

/**
 * 공간 하나의 KPI를 원본 데이터(Record, GuestbookNote)에서 다시 계산해
 * 오늘 날짜(KST)의 SpaceKPI 행에 저장한다.
 *
 * "QR 이용자"는 QR 스캔 자체(SpaceScan)가 아니라 방문 기록(Record)을 기준으로 센다 —
 * QR 스캔은 로그인 전에도 발생해 사용자를 특정할 수 없는 경우가 많은 반면,
 * Record는 로그인 사용자가 실제로 방문을 완료했을 때만 생기고 12시간 재방문 정책도
 * 이미 이 테이블에 반영돼 있기 때문이다(records/route.ts의 isNewVisit 로직 참고).
 */
export async function recomputeSpaceKPI(spaceId: string, at: Date = new Date()): Promise<void> {
  const { start: todayStart, end: todayEnd, dateOnly } = kstDayRange(at);
  const monthStart = kstMonthStart(at);

  const [records, guestbookNotes] = await Promise.all([
    prisma.record.findMany({
      where: { spaceId },
      select: { userId: true, visitedAt: true, tasteScore: true, tags: { select: { tag: true } } },
    }),
    prisma.guestbookNote.findMany({ where: { spaceId }, select: { userId: true } }),
  ]);

  const recordCountByUser = new Map<string, number>();
  const todayUsers = new Set<string>();
  const monthUsers = new Set<string>();
  let scoreSum = 0;
  let scoreCount = 0;

  for (const r of records) {
    recordCountByUser.set(r.userId, (recordCountByUser.get(r.userId) ?? 0) + 1);
    if (r.visitedAt >= todayStart && r.visitedAt < todayEnd) todayUsers.add(r.userId);
    if (r.visitedAt >= monthStart && r.visitedAt < todayEnd) monthUsers.add(r.userId);
    if (typeof r.tasteScore === "number") {
      scoreSum += r.tasteScore;
      scoreCount += 1;
    }
  }

  const qrUsersToday = todayUsers.size;
  const qrUsersMonth = monthUsers.size;
  const qrUsersTotal = recordCountByUser.size;

  const revisitUsersTotal = [...recordCountByUser.values()].filter((c) => c > 1).length;
  const revisitRate = qrUsersTotal > 0 ? revisitUsersTotal / qrUsersTotal : 0;

  const averageTasteScore = scoreCount > 0 ? scoreSum / scoreCount : null;

  const rankedTags = aggregateSpaceTags(records);
  const topTags: TopTagEntry[] = rankedTags.slice(0, 3).map(([tag, count]) => ({ tag, label: TAG_LABELS[tag], count }));
  const usageSummary = generateSpaceUsageSummary(rankedTags);

  const guestbookUserSet = new Set(guestbookNotes.map((n) => n.userId));
  const guestbookUsersTotal = guestbookUserSet.size;
  const totalGuestbookCount = guestbookNotes.length;
  const guestbookRate = qrUsersTotal > 0 ? guestbookUsersTotal / qrUsersTotal : 0;

  const data = {
    qrUsersToday,
    qrUsersMonth,
    qrUsersTotal,
    revisitUsersTotal,
    revisitRate,
    guestbookUsersTotal,
    guestbookRate,
    totalGuestbookCount,
    averageTasteScore,
    tasteScoreCount: scoreCount,
    topTags: topTags as unknown as Prisma.InputJsonValue,
    usageSummary,
  };

  await prisma.spaceKPI.upsert({
    where: { spaceId_date: { spaceId, date: dateOnly } },
    create: { spaceId, date: dateOnly, ...data },
    update: data,
  });
}

export async function getLatestSpaceKPI(spaceId: string) {
  return prisma.spaceKPI.findFirst({
    where: { spaceId },
    orderBy: { date: "desc" },
  });
}

export interface PeriodKpiStats {
  qrUsers: number;
  returningUsers: number;
  revisitRate: number;
  guestbookWriters: number;
  guestbookPosts: number;
  guestbookRate: number;
  averageTasteScore: number | null;
}

/**
 * 특정 기간(월간 리포트 구간 등)의 KPI를 순수 함수로 계산한다.
 * recomputeSpaceKPI와 동일한 정의를 기간 한정으로 재사용한다 — "QR 이용자"는 Record.userId 기준,
 * 재방문은 기간 내 Record 2건 이상(12시간 재방문 정책은 Record 생성 시점에 이미 적용돼 있음,
 * src/lib/visit.ts의 isNewVisit 참고), 방명록 작성률은 방명록 작성 고유 사용자 / QR 이용 고유 사용자.
 * DB에서 미리 필터링하지 않고 이 함수 안에서 기간을 판정한다 — recomputeSpaceKPI와 동일한 스타일이라
 * 인자로 임의의(기간과 무관한) 배열을 넣어도 안전하게 재사용/테스트할 수 있다.
 */
export function computePeriodStats(
  records: { userId: string; visitedAt: Date; tasteScore: number | null }[],
  guestbookNotes: { userId: string; createdAt: Date }[],
  periodStart: Date,
  periodEnd: Date,
): PeriodKpiStats {
  const periodRecords = records.filter((r) => r.visitedAt >= periodStart && r.visitedAt < periodEnd);

  const countByUser = new Map<string, number>();
  let scoreSum = 0;
  let scoreCount = 0;
  for (const r of periodRecords) {
    countByUser.set(r.userId, (countByUser.get(r.userId) ?? 0) + 1);
    if (typeof r.tasteScore === "number") {
      scoreSum += r.tasteScore;
      scoreCount += 1;
    }
  }

  const qrUsers = countByUser.size;
  const returningUsers = [...countByUser.values()].filter((c) => c > 1).length;
  const revisitRate = qrUsers > 0 ? returningUsers / qrUsers : 0;
  const averageTasteScore = scoreCount > 0 ? scoreSum / scoreCount : null;

  const periodNotes = guestbookNotes.filter((n) => n.createdAt >= periodStart && n.createdAt < periodEnd);
  const guestbookWriters = new Set(periodNotes.map((n) => n.userId)).size;
  const guestbookPosts = periodNotes.length;
  const guestbookRate = qrUsers > 0 ? guestbookWriters / qrUsers : 0;

  return { qrUsers, returningUsers, revisitRate, guestbookWriters, guestbookPosts, guestbookRate, averageTasteScore };
}

/** 공간의 원본 Record/GuestbookNote를 가져와 기간 한정 KPI를 계산한다. */
export async function getSpaceMonthlyKpi(spaceId: string, periodStart: Date, periodEnd: Date): Promise<PeriodKpiStats> {
  const [records, guestbookNotes] = await Promise.all([
    prisma.record.findMany({ where: { spaceId }, select: { userId: true, visitedAt: true, tasteScore: true } }),
    prisma.guestbookNote.findMany({ where: { spaceId }, select: { userId: true, createdAt: true } }),
  ]);
  return computePeriodStats(records, guestbookNotes, periodStart, periodEnd);
}
