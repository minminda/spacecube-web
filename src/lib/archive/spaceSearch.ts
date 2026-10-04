/* ── 공간 추가 검색(순수 함수) ─────────────────────────────────────────────
   내 아카이브의 "공간 추가"는 공간을 새로 만들지 않는다 — 공간큐브에 등록된 canonical 공간(EditorialSpace)을 찾아 고르고,
   그 공간에 내 기록(가보고 싶어요 · 다녀왔어요 · 사진 · 날짜 · 메모)만 붙인다.
   검색 대상: 공간명 · 지역 · 주소 · 유형(category). 낱말이 여러 개면 모두 어딘가에 맞아야 한다(AND).
   순위: 이름이 검색어로 시작 > 이름에 포함 > 지역 > 유형 > 주소. 같은 순위면 이름 가나다. ── */

import { normalizeArea } from "@/lib/editorial/area";

export interface SearchableSpace {
  id: string;
  name: string;
  area: string;
  category: string;
  address: string | null;
}

const compact = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, "");

/** 낱말 하나가 이 공간에 얼마나 강하게 맞는지(0 = 안 맞음). */
function tokenScore(s: SearchableSpace, token: string): number {
  const name = compact(s.name);
  if (name.startsWith(token)) return 100;
  if (name.includes(token)) return 80;
  const area = compact(s.area);
  const areaShort = compact(normalizeArea(s.area));
  if (area.includes(token) || (areaShort && token.includes(areaShort) && areaShort.length >= 2) || areaShort.includes(token)) return 50;
  if (compact(s.category).includes(token)) return 40;
  if (compact(s.address).includes(token)) return 30;
  return 0;
}

/** 검색어를 낱말로 — 공백으로 나누고 빈 낱말 제거, 최대 4개. */
export function searchTokens(q: string): string[] {
  return q.toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 4);
}

export function searchSpaces<T extends SearchableSpace>(rows: T[], q: string, limit = 8): T[] {
  const tokens = searchTokens(q);
  if (tokens.length === 0) return [];
  const scored: { row: T; score: number }[] = [];
  for (const row of rows) {
    let total = 0;
    let ok = true;
    for (const t of tokens) {
      const s = tokenScore(row, t);
      if (s === 0) { ok = false; break; }
      total += s;
    }
    if (ok) scored.push({ row, score: total });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name, "ko"))
    .slice(0, limit)
    .map((x) => x.row);
}

/** 주소는 카드에 다 보여주지 않는다 — 앞부분(구·동 정도)만. */
export function addressHint(address: string | null | undefined, max = 18): string | null {
  const a = (address ?? "").trim().replace(/\s+/g, " ");
  if (!a) return null;
  return a.length > max ? `${a.slice(0, max)}…` : a;
}

/** 내가 이 공간을 이미 담았는지 — 아카이브 기록 · 공간 저장 · Cube 방문을 합쳐 하나의 상태로. 중복 기록을 만들지 않기 위한 기준. */
export type MyState = { kind: "none" } | { kind: "saved"; entryId: string | null; memo: string | null } | { kind: "visited"; entryId: string | null; memo: string | null; visits: number };

export function myStateOf(x: {
  entry: { id: string; status: "SAVED" | "VISITED"; memo: string | null; visits: number } | null;
  saved: boolean;
  cubeVisits: number;
}): MyState {
  const visits = (x.entry?.visits ?? 0) + x.cubeVisits;
  if (x.entry?.status === "VISITED" || x.cubeVisits > 0) return { kind: "visited", entryId: x.entry?.id ?? null, memo: x.entry?.memo ?? null, visits: Math.max(visits, 1) };
  if (x.entry || x.saved) return { kind: "saved", entryId: x.entry?.id ?? null, memo: x.entry?.memo ?? null };
  return { kind: "none" };
}
