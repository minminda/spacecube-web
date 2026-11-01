/* ── HOME 선반 채우기 — 순수 함수 ───────────────────────────────────────────
   공간이 늘어도 선반마다 카드 수가 달라 데스크톱에서 한쪽이 휑해 보였다. 이 단계는 diversifyHome이 끝난 뒤:
   - 채울 수 있는 선반(유형 · 테마 · 지역 · 새로 소개)이 target장보다 적으면, 그 선반 주제와 태그가 가장 겹치는 다른 공간으로 target장까지 채운다
     (한 공간은 HOME 전체에서 maxPerSpace회까지 · 한 선반 안에서는 한 번만 · 바로 앞 선반에 있던 공간은 뒤로 미룬다).
   - 그 선반의 "원래 주제에 맞는" 공간이 minNative장보다 적으면 채우지 않고 선반을 없앤다(전혀 다른 공간으로 억지로 채우면 선반 제목이 거짓이 된다).
   - 노출 횟수가 모자라 target까지 못 채우는 선반도 없앤다 → 선반 수를 줄여서라도 남은 선반은 꽉 차게. 없앤 선반이 쓰던 횟수는 다음 선반이 쓴다.
   채울 수 없는 선반(함께한 공간 · 개인화 · 편집 선반)은 건드리지 않고 노출 횟수로만 센다. ── */

export interface FillShelf<C> {
  key: string;
  cards: C[];
  /** true인 선반만 채우거나 없앤다 */
  fillable: boolean;
}

export interface FillOptions {
  target: number;
  maxPerSpace: number;
  /** 원래 카드가 이 수보다 적은 채울 수 있는 선반은 없앤다 */
  minNative: number;
}

export function fillShelves<C>(
  shelves: FillShelf<C>[],
  pool: C[],
  idOf: (c: C) => string,
  tagsOf: (c: C) => string[],
  opts: FillOptions,
): { key: string; cards: C[] }[] {
  const dropped = new Set<string>();
  // 없애는 선반이 생기면 처음부터 다시 — 풀린 노출 횟수를 뒤 선반이 쓰도록(최대 선반 수만큼 반복)
  for (let round = 0; round <= shelves.length; round++) {
    const out = shelves.map((s) => ({ key: s.key, cards: dropped.has(s.key) ? [] : [...s.cards] }));
    const counts = new Map<string, number>();
    for (const s of out) for (const c of s.cards) counts.set(idOf(c), (counts.get(idOf(c)) ?? 0) + 1);

    let failed: string | null = null;
    let prevIds = new Set<string>();
    for (let i = 0; i < shelves.length && !failed; i++) {
      const shelf = shelves[i];
      const cur = out[i];
      if (shelf.fillable && !dropped.has(shelf.key)) {
        if (cur.cards.length < opts.minNative) { failed = shelf.key; break; }
        const need = opts.target - cur.cards.length;
        if (need > 0) {
          const present = new Set(cur.cards.map(idOf));
          const topic = new Set(cur.cards.flatMap(tagsOf));
          const scored = pool
            .map((c, idx) => ({ c, idx, id: idOf(c) }))
            .filter((x) => !present.has(x.id) && (counts.get(x.id) ?? 0) < opts.maxPerSpace)
            .map((x) => ({ ...x, score: tagsOf(x.c).filter((t) => topic.has(t)).length * 10 - (prevIds.has(x.id) ? 5 : 0) }))
            .sort((a, b) => b.score - a.score || a.idx - b.idx);
          if (scored.length < need) { failed = shelf.key; break; }
          for (const x of scored.slice(0, need)) {
            cur.cards.push(x.c);
            counts.set(x.id, (counts.get(x.id) ?? 0) + 1);
          }
        }
      }
      if (cur.cards.length > 0) prevIds = new Set(cur.cards.map(idOf));
    }
    if (!failed) return out;
    dropped.add(failed);
  }
  return shelves.map((s) => ({ key: s.key, cards: dropped.has(s.key) ? [] : s.cards }));
}
