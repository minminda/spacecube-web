/* ── 졸업전시 전용 KPI 시뮬레이션 — 순수 함수 ─────────────────────────────────────────
   실제 QR 스캔이 적어 운영자 분석 화면을 보여주기 어려워서, "화면에서만" 계산해 보여주는
   예시 데이터다. DB에 아무것도 쓰지 않고(SpaceScan 등 무변경) 고정 seed로 매번 같은 값을
   만든다. prisma 등 서버 전용 의존성을 넣지 않는다(테스트·client 모두 import 가능). ── */
import { addDays, formatKstDateParam } from "@/lib/reportDateRange";

export const SIM_SEED = "gradshow-2026-11-04";
export const SIM_DAYS = 30;
export const SIM_MIN_TOTAL = 15;
export const SIM_MAX_TOTAL = 30;
/** 실데이터를 그대로 유지하는 공간(시뮬레이션 제외). */
export const SIM_EXCLUDED_SPACE_NAMES = ["아카커피룸"];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — 같은 seed면 항상 같은 수열. */
function rng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 공간별 30일 QR 스캔 합계(15~30). 공간 id 정렬 순서에 15~30의 순열을 배정해 16곳까지는
 * 서로 다른 값이 나온다(그 이상이면 값이 반복).
 */
export function simulateScanTotals(spaceIds: string[]): Map<string, number> {
  const pool = Array.from({ length: SIM_MAX_TOTAL - SIM_MIN_TOTAL + 1 }, (_, i) => SIM_MIN_TOTAL + i);
  const rand = rng(`${SIM_SEED}:totals`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = new Map<string, number>();
  [...spaceIds].sort().forEach((id, i) => out.set(id, pool[i % pool.length]));
  return out;
}

/** 합계를 30일에 자연스럽게 흩뿌린다(합계 정확히 보존, 0건인 날 포함, 최근으로 갈수록 약간 증가). 오래된 날 → 최근 순. */
export function simulateDailyCounts(spaceId: string, total: number, days = SIM_DAYS): number[] {
  const rand = rng(`${SIM_SEED}:daily:${spaceId}`);
  const weights = Array.from({ length: days }, (_, i) => (0.15 + rand() ** 2 * 1.6) * (0.6 + (0.8 * i) / Math.max(1, days - 1)));
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const counts = raw.map(Math.floor);
  let rest = total - counts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k++, rest--) counts[order[k % days].i] += 1;
  return counts;
}

export interface SimulatedSpaceScans {
  spaceId: string;
  name: string;
  total: number;
  daily: { date: string; count: number }[];
}

/** now 기준 최근 30일(KST, 오늘 포함)의 날짜별 시뮬레이션. */
export function buildSimulatedScans(spaces: { id: string; name: string }[], now: Date): SimulatedSpaceScans[] {
  const totals = simulateScanTotals(spaces.map((s) => s.id));
  const first = addDays(now, -(SIM_DAYS - 1));
  return spaces.map((s) => {
    const total = totals.get(s.id) ?? SIM_MIN_TOTAL;
    const counts = simulateDailyCounts(s.id, total);
    return {
      spaceId: s.id,
      name: s.name,
      total,
      daily: counts.map((count, i) => ({ date: formatKstDateParam(addDays(first, i)), count })),
    };
  });
}

/** [from, to](KST 날짜 문자열, 양끝 포함) 구간의 시연 스캔 합. 시연 30일 밖의 날짜는 0으로 센다. */
export function simulatedCountInRange(daily: { date: string; count: number }[], from: string, to: string): number {
  return daily.filter((d) => d.date >= from && d.date <= to).reduce((n, d) => n + d.count, 0);
}

/** 기존 일별 추이의 날짜 축(dates)에 맞춰 시연 값을 채운다(없는 날은 0). */
export function simulatedTrendForDates(daily: { date: string; count: number }[], dates: string[]): { date: string; count: number }[] {
  const map = new Map(daily.map((d) => [d.date, d.count]));
  return dates.map((date) => ({ date, count: map.get(date) ?? 0 }));
}
