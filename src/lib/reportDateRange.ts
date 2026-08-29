/* ── 관리자 운영 리포트 "기간 조회" 전용 순수 함수 모음 ──────────────────────────────
   KST(Asia/Seoul) 달력일 문자열("YYYY-MM-DD")과 [start, end) 반개방 구간 사이를 변환한다.
   kpi.ts/reportPeriod.ts가 이미 각자 KST_OFFSET_MS 기반 자정 계산을 갖고 있지만(월간 리포트
   구간용), 이 파일은 "관리자가 입력한 날짜 문자열 파싱 + 검증"이라는 별개 관심사라 독립시켰다.
   client 컴포넌트에서도 그대로 import하므로 prisma 등 서버 전용 의존성은 절대 넣지 않는다. ── */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 최대 62일까지만 일별 추이를 그린다 — 그 이상은 막대가 너무 촘촘해져 생략한다(§10). */
export const MAX_TREND_DAYS = 62;

export type DateRangePreset = "today" | "7d" | "30d" | "all";

function kstParts(date: Date): { y: number; m: number; d: number } {
  const k = new Date(date.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth(), d: k.getUTCDate() };
}

/** KST 달력일 기준 "YYYY-MM-DD" 문자열로 포맷한다. */
export function formatKstDateParam(date: Date): string {
  const { y, m, d } = kstParts(date);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "YYYY-MM-DD"(KST 달력일) 문자열을 그 날짜의 KST 00:00을 나타내는 Date로 파싱한다.
 *  형식이 틀리거나(예: "2026-13-40") 실존하지 않는 날짜(예: "2026-02-30")면 null. */
export function parseKstDateStart(str: string | undefined | null): Date | null {
  if (!str) return null;
  const match = DATE_RE.exec(str);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - KST_OFFSET_MS);
  // Date.UTC는 2/30 같은 값을 다음 달로 밀어 넣어 조용히 "정상 처리"하므로, 왕복 검증으로 걸러낸다.
  const check = kstParts(start);
  if (check.y !== y || check.m !== m - 1 || check.d !== d) return null;
  return start;
}

/** "YYYY-MM-DD" → "YYYY.MM.DD" (Date 객체를 거치지 않는 순수 문자열 변환 — 서버 타임존에 좌우되지 않음). */
export function toDotFormat(isoDate: string): string {
  return isoDate.replace(/-/g, ".");
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS);
}

/** 프리셋(오늘/최근7일/최근30일/전체)에 해당하는 [from, to] KST 날짜 문자열을 계산한다.
 *  to는 항상 "오늘"(KST) — 각 프리셋 모두 "오늘까지" 조회라는 전제(§4)를 공유한다. */
export function presetDateRange(preset: DateRangePreset, now: Date, allTimeStart: Date): { from: string; to: string } {
  const today = formatKstDateParam(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: formatKstDateParam(addDays(now, -6)), to: today };
    case "30d":
      return { from: formatKstDateParam(addDays(now, -29)), to: today };
    case "all":
      return { from: formatKstDateParam(allTimeStart), to: today };
  }
}

/** 현재 from/to가 프리셋 중 하나와 정확히 일치하면 그 프리셋을, 아니면 null을 반환한다(버튼 활성 표시용). */
export function detectActivePreset(from: string, to: string, now: Date, allTimeStart: Date): DateRangePreset | null {
  const presets: DateRangePreset[] = ["today", "7d", "30d", "all"];
  for (const preset of presets) {
    const range = presetDateRange(preset, now, allTimeStart);
    if (range.from === from && range.to === to) return preset;
  }
  return null;
}

export interface ResolvedDateRange {
  /** 반개방 구간의 시작(포함) — KST 00:00. */
  start: Date;
  /** 반개방 구간의 끝(미포함) — to 다음날 KST 00:00. */
  end: Date;
  from: string;
  to: string;
  /** 쿼리 파라미터가 없거나(최초 진입) 잘못되어(형식 오류·역전) 기본값(최근 30일)으로 대체됐는지. */
  usedFallback: boolean;
}

/**
 * 관리자가 URL로 넘긴 from/to를 검증해 [start, end) 구간으로 만든다.
 * - 둘 다 없으면: 최근 30일 기본값(§3), usedFallback=false(정상적인 최초 진입).
 * - 하나만 있으면: 그 날짜 하루짜리 구간으로 해석(§19 "한 날짜만 선택" 케이스를 에러가 아니라
 *   자연스러운 단일일 조회로 처리).
 * - 형식이 틀렸거나 start > end면: 최근 30일로 폴백, usedFallback=true(화면에 안내 가능).
 */
export function resolveDateRange(
  fromParam: string | undefined | null,
  toParam: string | undefined | null,
  allTimeStart: Date,
  now: Date = new Date(),
): ResolvedDateRange {
  function fallbackToDefault(): ResolvedDateRange {
    const { from, to } = presetDateRange("30d", now, allTimeStart);
    return {
      start: parseKstDateStart(from) as Date,
      end: addDays(parseKstDateStart(to) as Date, 1),
      from,
      to,
      usedFallback: true,
    };
  }

  if (!fromParam && !toParam) {
    const { from, to } = presetDateRange("30d", now, allTimeStart);
    return {
      start: parseKstDateStart(from) as Date,
      end: addDays(parseKstDateStart(to) as Date, 1),
      from,
      to,
      usedFallback: false,
    };
  }

  const effectiveFrom = fromParam || toParam || "";
  const effectiveTo = toParam || fromParam || "";
  const start = parseKstDateStart(effectiveFrom);
  const endDay = parseKstDateStart(effectiveTo);
  if (!start || !endDay) return fallbackToDefault();
  if (start.getTime() > endDay.getTime()) return fallbackToDefault();

  return { start, end: addDays(endDay, 1), from: effectiveFrom, to: effectiveTo, usedFallback: false };
}

export interface DailyCount {
  date: string; // KST "YYYY-MM-DD"
  count: number;
}

/**
 * [start, end) 구간을 KST 달력일 단위로 0건 포함해 채운 뒤 visitedAt 목록을 집계한다(순수 함수,
 * DB 접근 없음 — 실제 조회는 kpi.ts의 getDailyVisitTrend가 담당). 구간이 MAX_TREND_DAYS를
 * 넘으면 막대가 과도하게 촘촘해지므로 빈 배열을 반환해 "생략" 신호로 쓴다.
 */
export function buildDailyVisitTrend(visitedAtList: Date[], start: Date, end: Date): DailyCount[] {
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (totalDays <= 0 || totalDays > MAX_TREND_DAYS) return [];

  const counts = new Map<string, number>();
  for (let i = 0; i < totalDays; i++) {
    counts.set(formatKstDateParam(addDays(start, i)), 0);
  }
  for (const visitedAt of visitedAtList) {
    if (visitedAt < start || visitedAt >= end) continue;
    const key = formatKstDateParam(visitedAt);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export interface HourlyCount {
  hour: number; // KST 0~23
  count: number;
}

/**
 * 하루(24시간, [dayStart, dayEnd)) 구간을 KST 시간대별로 0건 포함해 채운 뒤 타임스탬프
 * 목록을 집계한다(순수 함수, DB 접근 없음 — 실제 조회는 reportMetrics.ts의
 * getHourlyPeriodStats가 담당). dayStart/dayEnd는 반드시 KST 00:00~다음날 00:00을 나타내는
 * Date 쌍이어야 한다(resolveDateRange의 결과 중 from===to일 때의 start/end를 그대로 쓴다).
 * getHours() 같은 로컬 getter를 전혀 쓰지 않고 dayStart로부터의 ms 오프셋만으로 시간대를
 * 계산하므로, 서버 프로세스가 어떤 타임존으로 돌든 항상 KST 기준으로 정확하다(monthlyReport.ts
 * 상단 주석에 기록된 "로컬 getter로 KST 날짜를 표시하지 말 것" 함정과 같은 종류의 실수를
 * 피하기 위함).
 */
export function buildHourlyTrend(timestamps: Date[], dayStart: Date, dayEnd: Date): HourlyCount[] {
  const totalHours = Math.round((dayEnd.getTime() - dayStart.getTime()) / HOUR_MS);
  if (totalHours !== 24) return [];

  const counts = new Array(24).fill(0) as number[];
  for (const ts of timestamps) {
    if (ts < dayStart || ts >= dayEnd) continue;
    const idx = Math.floor((ts.getTime() - dayStart.getTime()) / HOUR_MS);
    if (idx >= 0 && idx < 24) counts[idx] += 1;
  }
  return counts.map((count, hour) => ({ hour, count }));
}
