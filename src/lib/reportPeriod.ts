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
