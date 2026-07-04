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

/**
 * 빈도 가중 CBF 점수 — 사용자가 많이 선택한 태그일수록 높은 점수
 * 예) 사용자: {QUIET:3, FOCUSED:2} / 공간: [QUIET, FOCUSED] → 점수 = 5
 */
export function scoreSpaceWeighted(
  space: SpaceCandidate,
  userTagCounts: Partial<Record<Tag, number>>,
): number {
  return space.spaceTags.reduce((sum, tag) => sum + (userTagCounts[tag] ?? 0), 0);
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

/* ── tasteScore 가중치 추천 (ENABLE_TASTE_SCORE_RECOMMENDATION) ──────────
   사용자가 높은 점수를 준 공간의 태그일수록 취향 벡터에서 더 큰 가중치.
   예) 공간A [조용한,사색적인] 5점 + 공간C [따뜻한,조용한] 4점
       → 조용한 9, 사색적인 5, 따뜻한 4                                   */

export type TasteVector = Partial<Record<Tag, number>>;

export interface VectorRecord {
  tasteScore: number | null;
  tags: { tag: Tag }[]; // 레거시 RecordTag (spaceTags 없을 때 fallback)
  space: { spaceTags: Tag[] };
}

/** 기록 목록 → tasteScore 가중 취향 벡터 */
export function buildTasteVector(records: VectorRecord[]): TasteVector {
  const vector: TasteVector = {};
  for (const r of records) {
    const tags = r.space.spaceTags.length > 0 ? r.space.spaceTags : r.tags.map((t) => t.tag);
    const weight = r.tasteScore ?? 3; // 점수 없는 레거시 기록은 중립 가중치
    for (const tag of tags) {
      vector[tag] = (vector[tag] ?? 0) + weight;
    }
  }
  return vector;
}

/** 벡터 상위 태그 목록 ([Tag, weight][] 내림차순) */
export function vectorTopTags(vector: TasteVector): [Tag, number][] {
  return (Object.entries(vector) as [Tag, number][]).sort((a, b) => b[1] - a[1]);
}

/** 벡터 기반 추천: 겹치는 태그 가중치 합산, 점수 높은 순 상위 N개 (0점 제외) */
export function rankSpacesByVector<T extends { spaceTags: Tag[] }>(
  candidates: T[],
  vector: TasteVector,
  limit = 3,
): (T & { score: number })[] {
  return candidates
    .map((s) => ({ ...s, score: s.spaceTags.reduce((sum, t) => sum + (vector[t] ?? 0), 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 벡터 기반 추천 이유 — 기술적 느낌 없이 "결이 닮은" 문장으로 */
export function getVectorReason(space: { spaceTags: Tag[] }, vector: TasteVector): string {
  const matched = space.spaceTags
    .filter((t) => (vector[t] ?? 0) > 0)
    .sort((a, b) => (vector[b] ?? 0) - (vector[a] ?? 0))
    .slice(0, 2);
  if (matched.length === 0) return "당신이 좋아한 공간들의 분위기와 가장 가까운 공간이에요.";
  const labels = matched.map((t) => `'${TAG_LABELS[t]}'`).join(", ");
  return `최근 높은 점수를 준 공간들과 ${labels} 결이 닮아 있어요.`;
}
