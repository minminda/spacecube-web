/* ── HOME 선반 간 같은 공간 반복 완화 — 순수 함수 ─────────────────────────────
   새 추천 점수를 만들지 않는다. 각 선반이 이미 만든 후보 순서(기존 ranking)를 그대로 두고,
   HOME에서 이미 몇 번 나온 공간인지(exposure)만 보정한다. 선반은 HOME에 보이는 순서대로 처리한다.
   - strong: 노출 횟수 적게 나온 순(0 → 1 → 2 → …)으로 먼저(같은 횟수끼리는 원래 순서). 새롭게 소개 · 테마 · EDITORIAL.
   - light : 2회 이상 나온 공간만 뒤로. 나머지는 원래 순서. 지역 · 엄선 · 관심 지역 · 비슷한 사람.
   - none  : 손대지 않는다. 내가 찜한 · 다시 떠올려볼 · 함께한 공간처럼 선반 자체가 그 공간들의 목록인 선반.
   기본은 후보를 뒤로 보낼 뿐 빼지 않으므로, 후보가 모자라면 자연스럽게 중복이 허용된다(최대 2회는 선호).
   hardCap 모드(HOME): 한 공간은 HOME 전체에서 MAX_PER_SPACE회까지만 — 넘는 카드는 빼고, 남은 카드가 minCards보다 적은 선반은 통째로 비운다(선반 수 정리).
   선반 자체가 그 공간들의 목록인 none 선반(찜 · 다시 떠올려볼 · 함께한 공간)은 항상 보이므로 먼저 세어 두고, 다른 선반이 그만큼을 덜 쓰게 한다. ── */

export type DiversityStrength = "strong" | "light" | "none";

/** 같은 공간을 HOME에서 2번까지는 허용, 그 이상은 후순위 */
export const MAX_PER_SPACE = 2;

export interface DiversityShelf<C> {
  key: string;
  strength: DiversityStrength;
  /** 화면에 보일 카드 수(후보는 이보다 많아도 된다) */
  limit: number;
  /** 기존 ranking 순서의 후보 */
  cards: C[];
}

export interface DiversityOptions {
  /** 한 공간을 MAX_PER_SPACE회까지만 보이게(넘는 카드는 제외) */
  hardCap?: boolean;
  /** hardCap일 때 이보다 카드가 적게 남는 선반은 비운다(기본 3) */
  minCards?: number;
}

/** shelves는 HOME에 보이는 순서. 반환은 같은 순서·같은 key의 최종 카드(limit개 이하). */
export function diversifyShelves<C>(shelves: DiversityShelf<C>[], spaceIdOf: (c: C) => string, opts: DiversityOptions = {}): { key: string; cards: C[] }[] {
  const counts = new Map<string, number>();
  const minCards = opts.minCards ?? 3;
  if (opts.hardCap) {
    for (const s of shelves) if (s.strength === "none") for (const c of s.cards.slice(0, s.limit)) counts.set(spaceIdOf(c), (counts.get(spaceIdOf(c)) ?? 0) + 1);
  }
  /** 선반의 첫 카드로 쓰인 횟수 — 같은 노출 횟수끼리는 첫 카드로 덜 쓰인 공간을 앞세운다 */
  const leads = new Map<string, number>();
  return shelves.map((shelf) => {
    const tier = (c: C) => {
      const n = counts.get(spaceIdOf(c)) ?? 0;
      return shelf.strength === "strong" ? n : n >= MAX_PER_SPACE ? 1 : 0;
    };
    const ordered =
      shelf.strength === "none"
        ? shelf.cards
        : shelf.cards.map((card, i) => ({ card, i, t: tier(card), l: shelf.strength === "strong" ? leads.get(spaceIdOf(card)) ?? 0 : 0 })).sort((a, b) => a.t - b.t || a.l - b.l || a.i - b.i).map((x) => x.card);
    if (opts.hardCap && shelf.strength === "none") return { key: shelf.key, cards: ordered.slice(0, shelf.limit) }; // 이미 위에서 세어 둠
    let picked = ordered.slice(0, shelf.limit);
    if (opts.hardCap) {
      picked = ordered.filter((c) => (counts.get(spaceIdOf(c)) ?? 0) < MAX_PER_SPACE).slice(0, shelf.limit);
      if (picked.length < minCards) picked = [];
    }
    if (picked.length > 0) leads.set(spaceIdOf(picked[0]), (leads.get(spaceIdOf(picked[0])) ?? 0) + 1);
    for (const c of picked) counts.set(spaceIdOf(c), (counts.get(spaceIdOf(c)) ?? 0) + 1);
    return { key: shelf.key, cards: picked };
  });
}

/** 노출 횟수 집계(진단 · 테스트용) */
export function exposureCounts<C>(shelves: { cards: C[] }[], spaceIdOf: (c: C) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of shelves) for (const c of s.cards) m.set(spaceIdOf(c), (m.get(spaceIdOf(c)) ?? 0) + 1);
  return m;
}
