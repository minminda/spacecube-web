import { Tag } from "@prisma/client";

export interface SpaceCandidate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  imageUrl: string | null;
  type: string;
  district: string | null;
  spaceTags: Tag[];
}

/** 태그 기반 Content-Based Filtering 점수 계산 */
export function scoreSpace(
  space: SpaceCandidate,
  userTopTags: Tag[],
  mode: "similar" | "diverse",
): number {
  if (userTopTags.length === 0) return Math.random();

  const spaceTags = space.spaceTags.length > 0 ? space.spaceTags : userTopTags;
  const overlap = userTopTags.filter((t) => spaceTags.includes(t)).length;
  const maxLen = Math.max(userTopTags.length, spaceTags.length, 1);
  const tagSim = overlap / maxLen;

  return mode === "diverse" ? 1 - tagSim : tagSim;
}

/** 추천 공간 목록 반환 (상위 N개) */
export function rankSpaces(
  candidates: SpaceCandidate[],
  userTopTags: Tag[],
  mode: "similar" | "diverse",
  limit = 3,
): SpaceCandidate[] {
  return candidates
    .map((s) => ({ space: s, score: scoreSpace(s, userTopTags, mode) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ space }) => space);
}
