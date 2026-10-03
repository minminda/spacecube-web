/* ── 사용자 ↔ 큐레이터 취향 겹침(프로토타입) ─────────────────────────────────
   정확도 %를 만들지 않는다. 실제로 확인 가능한 두 가지 관계만 센다.
   1) 같은 공간: 내가 저장·방문한 공간을 그 큐레이터도 컬렉션에 담았는가
   2) 같은 결: 내 취향 속성(방문·저장에서 나온 공간 유형·태그·컬렉션 키워드)과 그 큐레이터가 고른 공간들의
      속성·선언 취향이 겹치는가
   이 두 개수로 "매우 비슷한 취향 / 취향이 많이 겹쳐요 / 일부 겹쳐요 / 새로운 취향" 중 하나로만 말한다.
   순수 함수 — Prisma 의존 없음(affinity.test.ts). ── */

import { attrKey, type TasteProfile } from "@/lib/discoveryRecommend";
import { hasBatchim, type FinderPick, type FinderSpace } from "./finder";

export type AffinityLevel = "very" | "many" | "some" | "new";

export const AFFINITY_LABEL: Record<AffinityLevel, string> = {
  very: "매우 비슷한 취향",
  many: "취향이 많이 겹쳐요",
  some: "일부 취향이 겹쳐요",
  new: "새로운 취향을 발견할 수 있어요",
};

const LEVEL_RANK: Record<AffinityLevel, number> = { very: 3, many: 2, some: 1, new: 0 };

export interface AffinityCurator {
  slug: string;
  name: string;
  isOfficial?: boolean;
  tasteTags: string[];
}

export interface CuratorAffinity {
  curator: AffinityCurator;
  level: AffinityLevel;
  /** 겹친 취향 속성(내 가중치 높은 순, 표시 이름) */
  sharedAttrs: string[];
  /** 내가 저장·방문한 공간 중 이 큐레이터도 고른 공간 id */
  sharedSpaceIds: string[];
}

/**
 * 프로토타입 취향 프로필 — 기존 발견 추천 프로필(방문·저장의 공간 유형·태그)에, 내가 저장·방문한 공간을 담은
 * 큐레이터 컬렉션의 키워드를 더한다(공간당 키워드 하나씩 1점). 기존 /recommend 계산에는 쓰지 않는 별도 객체.
 */
export function enrichProfileWithCollections(base: TasteProfile, mySpaceIds: Set<string>, picks: FinderPick[]): TasteProfile {
  const weights = new Map(base.weights);
  const labels = new Map(base.labels);
  const keywordsBySpace = new Map<string, Set<string>>();
  for (const p of picks) {
    if (!mySpaceIds.has(p.spaceId)) continue;
    const set = keywordsBySpace.get(p.spaceId) ?? new Set<string>();
    p.keywords.forEach((k) => set.add(k.trim()));
    keywordsBySpace.set(p.spaceId, set);
  }
  for (const set of keywordsBySpace.values()) {
    for (const k of set) {
      const key = attrKey(k);
      if (!key) continue;
      weights.set(key, (weights.get(key) ?? 0) + 1);
      if (!labels.has(key)) labels.set(key, k);
    }
  }
  return { ...base, weights, labels };
}

function levelOf(sharedSpaces: number, sharedAttrs: number): AffinityLevel {
  if (sharedSpaces >= 2 || (sharedSpaces >= 1 && sharedAttrs >= 2) || sharedAttrs >= 4) return "very";
  if (sharedSpaces >= 1 || sharedAttrs >= 2) return "many";
  if (sharedAttrs >= 1) return "some";
  return "new";
}

export function computeAffinities(
  profile: TasteProfile,
  mySpaceIds: Set<string>,
  curators: AffinityCurator[],
  picks: FinderPick[],
  spaces: Map<string, Pick<FinderSpace, "category" | "tags">>,
): CuratorAffinity[] {
  const out: CuratorAffinity[] = [];
  for (const curator of curators) {
    const mine = picks.filter((p) => p.curatorSlug === curator.slug);
    const attrs = new Set<string>(curator.tasteTags.map(attrKey));
    for (const p of mine) {
      p.keywords.forEach((k) => attrs.add(attrKey(k)));
      const s = spaces.get(p.spaceId);
      if (s) [s.category, ...(s.tags ?? [])].forEach((a) => attrs.add(attrKey(a)));
    }
    const shared = [...attrs]
      .filter((k) => k && (profile.weights.get(k) ?? 0) > 0)
      .sort((a, b) => (profile.weights.get(b) ?? 0) - (profile.weights.get(a) ?? 0));
    const sharedSpaceIds = [...new Set(mine.map((p) => p.spaceId).filter((id) => mySpaceIds.has(id)))];
    out.push({
      curator,
      level: levelOf(sharedSpaceIds.length, shared.length),
      sharedAttrs: shared.map((k) => profile.labels.get(k) ?? k),
      sharedSpaceIds,
    });
  }
  return out.sort(
    (a, b) =>
      LEVEL_RANK[b.level] - LEVEL_RANK[a.level] ||
      b.sharedSpaceIds.length - a.sharedSpaceIds.length ||
      b.sharedAttrs.length - a.sharedAttrs.length ||
      a.curator.name.localeCompare(b.curator.name, "ko"),
  );
}

/** "저장·방문한 공간 2곳을 민지님도 골랐어요 · 조용한 · 혼자 취향이 겹쳐요" — 실제 겹침만. */
export function affinityReason(a: CuratorAffinity, displayName: string): string {
  const parts: string[] = [];
  if (a.sharedSpaceIds.length > 0) parts.push(`내가 저장·방문한 공간 ${a.sharedSpaceIds.length}곳을 ${displayName}도 골랐어요`);
  if (a.sharedAttrs.length > 0) parts.push(`'${a.sharedAttrs.slice(0, 3).join(" · ")}' 취향이 겹쳐요`);
  if (parts.length === 0) return `아직 겹치는 공간은 없어요 — 평소와 다른 공간을 발견해볼 수 있어요`;
  return parts.join(" · ");
}

export interface CuratorPickRec<S extends FinderSpace> {
  space: S;
  curator: AffinityCurator;
  collectionTitle: string;
  comment: string | null;
  /** 이 공간과 내 취향이 겹친 속성 */
  overlap: string[];
}

/**
 * 취향이 맞는 큐레이터가 고른 공간 중 아직 저장·방문하지 않은 곳. 지역을 고르면 그 지역에서만.
 * 큐레이터 순서(겹침 높은 순)를 유지하고, 같은 공간은 한 번만.
 */
export function curatorPickRecommendations<S extends FinderSpace>(
  affinities: CuratorAffinity[],
  picks: FinderPick[],
  spaces: Map<string, S>,
  profile: TasteProfile,
  opts: { exclude: Set<string>; area?: (space: S) => boolean; limit?: number; maxCurators?: number },
): CuratorPickRec<S>[] {
  const out: CuratorPickRec<S>[] = [];
  const seen = new Set<string>();
  const top = affinities.filter((a) => a.level !== "new").slice(0, opts.maxCurators ?? 2);
  for (const a of top) {
    for (const p of picks.filter((x) => x.curatorSlug === a.curator.slug)) {
      const space = spaces.get(p.spaceId);
      if (!space || seen.has(space.id) || opts.exclude.has(space.id)) continue;
      if (opts.area && !opts.area(space)) continue;
      seen.add(space.id);
      const overlap = [...new Set([space.category, ...(space.tags ?? []), ...p.keywords].map((n) => n.trim()))]
        .filter((n) => (profile.weights.get(attrKey(n)) ?? 0) > 0)
        .sort((x, y) => (profile.weights.get(attrKey(y)) ?? 0) - (profile.weights.get(attrKey(x)) ?? 0));
      out.push({ space, curator: a.curator, collectionTitle: p.collectionTitle, comment: p.comment, overlap });
    }
  }
  // 겹친 속성이 많은 공간을 먼저(같으면 큐레이터 순서 유지 — Array.sort는 안정 정렬)
  out.sort((x, y) => y.overlap.length - x.overlap.length);
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/** "민지님이 추천했고, 저장한 공간들과 '조용한 · 혼자'가 겹쳐요" */
export function pickReason(displayName: string, overlap: string[], collectionTitle: string): string {
  const subj = `${displayName}${hasBatchim(displayName) ? "이" : "가"}`;
  if (overlap.length > 0) return `${subj} 추천했고, 내가 저장·방문한 공간들과 '${overlap.slice(0, 2).join(" · ")}' 결이 겹쳐요`;
  return `${subj} '${collectionTitle}'에 담은 곳이에요`;
}
