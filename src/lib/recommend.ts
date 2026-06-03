import { Tag } from "@prisma/client";
import { TAG_LABELS } from "@/lib/tags";

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

/** 태그 겹침 기반 CBF 점수 (0~1) */
export function scoreSpace(space: SpaceCandidate, userTopTags: Tag[]): number {
  if (userTopTags.length === 0 || space.spaceTags.length === 0) return 0;
  const overlap = userTopTags.filter((t) => space.spaceTags.includes(t)).length;
  const maxLen = Math.max(userTopTags.length, space.spaceTags.length, 1);
  return overlap / maxLen;
}

/** 추천 이유 문구 생성 */
export function getRecommendReason(space: SpaceCandidate, userTopTags: Tag[]): string {
  const matched = userTopTags.filter((t) => space.spaceTags.includes(t));
  if (matched.length === 0) return "";
  if (matched.length === 1) return `${TAG_LABELS[matched[0]]} 공간을 자주 기록하셨습니다.`;
  const labels = matched.slice(0, 2).map((t) => TAG_LABELS[t]);
  return `${labels.join(", ")} 태그가 최근 기록과 비슷합니다.`;
}

/** 취향 기반 추천 공간 목록 (상위 N개) */
export function rankSpaces(
  candidates: SpaceCandidate[],
  userTopTags: Tag[],
  limit = 3,
): SpaceCandidate[] {
  return candidates
    .map((s) => ({ space: s, score: scoreSpace(s, userTopTags) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ space }) => space);
}
