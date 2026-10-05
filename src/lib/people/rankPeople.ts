/* ── 추천 > 사람: 취향이 비슷한 사람 순서(순수 함수) ───────────────────────────────
   복잡한 모델 없이, 설명할 수 있는 규칙만 쓴다. 점수는 정렬에만 쓰고 화면에는 내보내지 않는다(퍼센트·일치율 금지).
   상대 쪽은 "공개 프로필에 실제로 보이는 공간"만 넣는다 — 비공개로 둔 공간은 비교에도 쓰지 않는다.
   보는 사람 쪽은 본인 아카이브 전체(자기 데이터)다.
     1) 같은 공간을 둘 다 다녀옴        +3
     2) 같은 공간이 둘 다에 있음(저장 포함) +2
     3) 고른 공간의 결(유형 · 태그)이 겹침  +0~2
     4) 공개한 공간이 많은 사람 조금 먼저   +0.1 × 공간 수(최대 8)
   취향 기록이 없는 사람(비로그인 포함)에게는 4)만으로 — 공개 공간이 충분한 사람부터. ── */

export interface PersonSpace {
  slug: string;
  visited: boolean;
}

export interface PersonCandidate {
  userId: string;
  /** 정렬이 같을 때의 안정적인 순서(공개 주소) */
  handle: string;
  /** 공개 프로필에 보이는 공간만 */
  spaces: PersonSpace[];
}

export interface ViewerTaste {
  /** 내 아카이브의 공간(slug) — 다녀온 곳 */
  visited: Set<string>;
  /** 내 아카이브의 공간(slug) — 저장만 한 곳 */
  saved: Set<string>;
}

export type PeopleReason = "visited" | "shared" | "feel";

export const PEOPLE_REASON_TEXT: Record<PeopleReason, string> = {
  visited: "다녀온 공간이 비슷해요",
  shared: "저장한 공간이 여러 곳 겹쳐요",
  feel: "고른 공간의 결이 비슷해요",
};

export interface RankedPerson {
  userId: string;
  reason: PeopleReason | null;
  /** 정렬용 — 화면 · 응답에 내보내지 않는다 */
  score: number;
}

/** 공간 slug → 결(유형 · 태그) 단어 */
export type SpaceFeatures = Map<string, string[]>;

function featureCounts(slugs: Iterable<string>, features: SpaceFeatures): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of slugs) for (const f of features.get(s) ?? []) out.set(f, (out.get(f) ?? 0) + 1);
  return out;
}

/** 결 겹침 0~1 — 두 사람의 결 단어 빈도에서 겹치는 몫(작은 쪽 기준). */
export function feelOverlap(a: Map<string, number>, b: Map<string, number>): number {
  let common = 0, totalA = 0, totalB = 0;
  for (const v of a.values()) totalA += v;
  for (const v of b.values()) totalB += v;
  if (totalA === 0 || totalB === 0) return 0;
  for (const [k, v] of a) common += Math.min(v, b.get(k) ?? 0);
  return common / Math.min(totalA, totalB);
}

export function rankPeople(viewer: ViewerTaste | null, candidates: PersonCandidate[], features: SpaceFeatures): RankedPerson[] {
  const mine = viewer ? new Set([...viewer.visited, ...viewer.saved]) : new Set<string>();
  const myFeel = featureCounts(mine, features);
  const seen = new Set<string>();
  const ranked: (RankedPerson & { handle: string; count: number })[] = [];

  for (const c of candidates) {
    if (seen.has(c.userId) || c.spaces.length === 0) continue;
    seen.add(c.userId);
    let bothVisited = 0, shared = 0;
    for (const s of c.spaces) {
      if (!mine.has(s.slug)) continue;
      if (s.visited && viewer!.visited.has(s.slug)) bothVisited += 1;
      else shared += 1;
    }
    const feel = mine.size > 0 ? feelOverlap(myFeel, featureCounts(c.spaces.map((s) => s.slug), features)) : 0;
    const richness = Math.min(c.spaces.length, 8) * 0.1;
    const score = bothVisited * 3 + shared * 2 + feel * 2 + richness;
    const common = bothVisited + shared;
    const reason: PeopleReason | null = bothVisited > 0 ? "visited" : common >= 2 ? "shared" : feel >= 0.5 ? "feel" : null;
    ranked.push({ userId: c.userId, reason, score, handle: c.handle, count: c.spaces.length });
  }

  return ranked
    .sort((a, b) => b.score - a.score || b.count - a.count || a.handle.localeCompare(b.handle))
    .map(({ userId, reason, score }) => ({ userId, reason, score }));
}
