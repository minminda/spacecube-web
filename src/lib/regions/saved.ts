/* ── 관심 지역(별표) — 순수 함수 ─────────────────────────────────────────────
   지역은 Region 테이블이 아직 없어 이름(normalizeArea 결과)으로 다룬다. "연남동" · "연남"은 같은 지역 "연남"이다.
   - 로그인 사용자: 서버(SavedRegion 테이블)에 저장.
   - 비로그인 사용자: 이 브라우저의 쿠키(sc_regions)에 저장 — HOME이 서버에서 그릴 때 읽을 수 있어야 해서 localStorage가 아니라 쿠키다.
     로그인 후 병합은 하지 않는다(쿠키 값은 로그인하면 쓰이지 않는다).
   저장 순서는 "최근에 별표한 지역이 먼저". ── */

import { normalizeArea } from "@/lib/editorial/area";

export const REGION_COOKIE = "sc_regions";
export const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** 한 사용자가 저장할 수 있는 지역 수 — HOME 선반 · 칩이 길어지지 않게 */
export const MAX_SAVED_REGIONS = 12;
const MAX_NAME_LENGTH = 30;

/** 저장용 지역 이름 — 정규화(연남동 → 연남) + 구분 문자 제거 + 길이 제한. 쓸 수 없으면 null. */
export function cleanRegion(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const area = normalizeArea(raw.replace(/[,|]/g, " "));
  return area && area.length <= MAX_NAME_LENGTH ? area : null;
}

/** 쿠키 값 → 지역 목록(중복 · 이상한 값 제거, 최대 개수까지) */
export function parseRegionCookie(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    /* 이미 풀린 값이면 그대로 */
  }
  const out: string[] = [];
  for (const part of text.split(",")) {
    const area = cleanRegion(part);
    if (area && !out.includes(area)) out.push(area);
    if (out.length >= MAX_SAVED_REGIONS) break;
  }
  return out;
}

export function serializeRegionCookie(list: string[]): string {
  return encodeURIComponent(list.join(","));
}

/** 별표 켜기/끄기 결과 목록 — 켜면 맨 앞에(최근 순), 끄면 뺀다. 한도를 넘으면 가장 오래된 것부터 밀려난다. */
export function withRegion(list: string[], area: string, saved: boolean): string[] {
  const clean = cleanRegion(area);
  if (!clean) return list;
  const rest = list.filter((a) => a !== clean);
  return saved ? [clean, ...rest].slice(0, MAX_SAVED_REGIONS) : rest;
}
