const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MAX_PERIOD_ITERATIONS = 2400; // 약 200년 — reportStartDate가 비정상적으로 오래됐을 때의 안전장치

interface DateParts {
  y: number;
  m: number; // 0-indexed
  d: number;
}

export interface PeriodBounds {
  start: Date;
  end: Date; // exclusive
}

export interface ReportPeriod {
  currentPeriodStart: Date;
  currentPeriodEnd: Date; // exclusive, 다음 리포트 공개일과 동일
  nextReportDate: Date;
  currentOffset: number;
}

function kstDateParts(date: Date): DateParts {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return { y: kst.getUTCFullYear(), m: kst.getUTCMonth(), d: kst.getUTCDate() };
}

/** KST 자정(해당 날짜 00:00)을 UTC Date로 변환한다. */
function kstMidnightFromParts(parts: DateParts): Date {
  return new Date(Date.UTC(parts.y, parts.m, parts.d, 0, 0, 0) - KST_OFFSET_MS);
}

/**
 * 연/월/일에서 개월 수를 더한다. 대상 월에 그 날짜가 없으면(예: 1/31 + 1개월 → 2월)
 * 그 달의 마지막 날로 클램프한다. 매 구간을 원본 시작일 기준으로 다시 계산하므로,
 * 월말 시작일이라도 날짜가 있는 달에는 다시 원래 일자로 돌아온다(예: 1/31 → 2/28 → 3/31).
 */
function addMonthsClamped(parts: DateParts, months: number): DateParts {
  const totalMonths = parts.m + months;
  const y = parts.y + Math.floor(totalMonths / 12);
  const m = ((totalMonths % 12) + 12) % 12;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(parts.d, daysInMonth);
  return { y, m, d };
}

/** reportStartDate 기준 offset번째 집계 구간의 [시작, 끝) 을 반환한다. offset=0이 첫 구간. */
export function getPeriodBounds(reportStartDate: Date, offset: number): PeriodBounds {
  const start = kstDateParts(reportStartDate);
  return {
    start: kstMidnightFromParts(addMonthsClamped(start, offset)),
    end: kstMidnightFromParts(addMonthsClamped(start, offset + 1)),
  };
}

/**
 * now가 속한 구간의 offset을 반환한다.
 * 전제: now >= reportStartDate (그 이전은 "아직 리포트가 시작되지 않음" 상태로 호출부에서 별도 처리).
 */
export function getCurrentPeriodOffset(reportStartDate: Date, now: Date = new Date()): number {
  let offset = 0;
  let bounds = getPeriodBounds(reportStartDate, offset);
  let guard = 0;
  while (now.getTime() >= bounds.end.getTime()) {
    offset += 1;
    bounds = getPeriodBounds(reportStartDate, offset);
    guard += 1;
    if (guard > MAX_PERIOD_ITERATIONS) {
      throw new Error("reportStartDate 기준 집계 구간 계산이 비정상적으로 반복되고 있습니다.");
    }
  }
  return offset;
}

/** 현재(진행 중) 집계 구간과 다음 리포트 공개일을 계산한다. */
export function computeReportPeriod(reportStartDate: Date, now: Date = new Date()): ReportPeriod {
  const currentOffset = getCurrentPeriodOffset(reportStartDate, now);
  const current = getPeriodBounds(reportStartDate, currentOffset);
  return {
    currentPeriodStart: current.start,
    currentPeriodEnd: current.end,
    nextReportDate: current.end,
    currentOffset,
  };
}

/** reportStartDate 이후 이미 끝난(공개 시점이 지난) 모든 구간을 offset 0부터 순서대로 반환한다. */
export function getCompletedPeriods(reportStartDate: Date, now: Date = new Date()): PeriodBounds[] {
  const currentOffset = getCurrentPeriodOffset(reportStartDate, now);
  const completed: PeriodBounds[] = [];
  for (let i = 0; i < currentOffset; i++) completed.push(getPeriodBounds(reportStartDate, i));
  return completed;
}

/* ── 관리자 "기준일" 프리셋(매월 1일 / 15일 / 마지막 날) ──────────────────────────
   자유 날짜 입력 대신 3가지 프리셋만 제공한다 — reportStartDate 자체의 저장 형식/의미는
   그대로 두고(day-of-month만 정해서 그 달 기준 날짜를 만든다), addMonthsClamped가 이미
   "그 달에 없는 날짜는 말일로 클램프"를 처리하므로 "마지막 날" 프리셋도 별도 로직 없이
   day=31로 저장하면 매달 자동으로 그 달의 말일로 맞춰진다. ──────────────────────── */
export type ReportDayPreset = 1 | 15 | "last";

/** 프리셋을 고를 때 실제 day-of-month 숫자로 변환한다("last"는 31 — addMonthsClamped가 알아서 클램프). */
function presetToDay(preset: ReportDayPreset): number {
  return preset === "last" ? 31 : preset;
}

/** "매월 N일" 프리셋에서 이번 달(KST) 기준 reportStartDate를 계산한다. */
export function computeReportStartDateForPreset(preset: ReportDayPreset, now: Date = new Date()): Date {
  const nowParts = kstDateParts(now);
  const daysInMonth = new Date(Date.UTC(nowParts.y, nowParts.m + 1, 0)).getUTCDate();
  const d = Math.min(presetToDay(preset), daysInMonth);
  return kstMidnightFromParts({ y: nowParts.y, m: nowParts.m, d });
}

export interface PreviewPeriods {
  current: PeriodBounds;
  previous: PeriodBounds | null;
}

/**
 * 관리자 페이지의 "현재 KPI"/"리포트 미리보기"가 쓸 진행 중 구간과 비교용 이전 구간을 정한다.
 * reportStartDate가 아직 없거나 미래(아직 시작 전)면, 리포트 설정 없이도 뭔가 보여줄 수 있도록
 * KST 달력 기준 "이번 달 1일~지금"으로 대체한다(실제 저장되는 값에는 영향 없음 — 미리보기 전용).
 */
export function resolvePreviewPeriods(reportStartDate: Date | null, now: Date = new Date()): PreviewPeriods {
  if (reportStartDate && reportStartDate.getTime() <= now.getTime()) {
    const period = computeReportPeriod(reportStartDate, now);
    const previous = period.currentOffset > 0 ? getPeriodBounds(reportStartDate, period.currentOffset - 1) : null;
    return { current: { start: period.currentPeriodStart, end: now }, previous };
  }

  const nowParts = kstDateParts(now);
  const currentStart = kstMidnightFromParts({ y: nowParts.y, m: nowParts.m, d: 1 });
  const prevMonthParts = addMonthsClamped({ y: nowParts.y, m: nowParts.m, d: 1 }, -1);
  const previousStart = kstMidnightFromParts(prevMonthParts);
  return { current: { start: currentStart, end: now }, previous: { start: previousStart, end: currentStart } };
}

/** 저장된 reportStartDate가 현재 어떤 프리셋에 해당하는지 추론한다(관리자 폼의 선택 표시용).
 *  프리셋 밖의 과거 자유 입력 값이면 그 날짜와 가장 가까운 프리셋으로 추정한다. */
export function inferReportDayPreset(reportStartDate: Date): ReportDayPreset {
  const parts = kstDateParts(reportStartDate);
  const daysInMonth = new Date(Date.UTC(parts.y, parts.m + 1, 0)).getUTCDate();
  if (parts.d >= daysInMonth) return "last";
  if (parts.d <= 1) return 1;
  if (parts.d <= 8) return 1;
  if (parts.d <= 22) return 15;
  return "last";
}
