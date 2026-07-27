import { getLatestRecordPerSpace, type SpaceVisitRecord } from "@/lib/taste";

/** 공간-태그 연결(SpaceTag) 한 건의 최소 형태 — recommend.ts 전역에서 공유. Tag.id가 벡터의 키가 된다. */
export interface SpaceTagLinkLike {
  visibleToUsers: boolean;
  tag: { id: string; name: string; isActive: boolean; useForRecommendation: boolean };
}

export interface SpaceCandidate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  imageUrl: string | null;
  type: string;
  district: string | null;
  /** 관리자가 연결한 태그(SpaceTag) — 추천 계산은 전부 이쪽만 본다(레거시 spaceTags 배열은 백필로
   *  이미 채워져 있으므로 별도 폴백을 두지 않는다 — SpaceForm은 이제 "공간 유형" 선택 시 반드시
   *  최소 1개의 SpaceTag를 만든다). */
  spaceTagLinks?: SpaceTagLinkLike[];
}

/** 유효한 SpaceTag 연결만 남긴다(비활성/추천제외 태그 제외 — 예: "공간 유형"은 분류일 뿐이라 기본 제외). */
function getValidSpaceTagLinks(space: { spaceTagLinks?: SpaceTagLinkLike[] }): SpaceTagLinkLike[] {
  return (space.spaceTagLinks ?? []).filter((l) => l.tag.isActive && l.tag.useForRecommendation);
}

/** 카드 등 좁은 공간에 보여줄 태그 이름 — 사용자 화면에 노출 가능한 활성 태그만, 최대 3개. */
export function visibleTagNames(links: SpaceTagLinkLike[]): string[] {
  return links.filter((l) => l.visibleToUsers && l.tag.isActive).slice(0, 3).map((l) => l.tag.name);
}

/** 빈도 가중 CBF 점수 — 사용자가 많이 선택한 태그일수록 높은 점수 (userTagCounts는 Tag.id 기준) */
export function scoreSpaceWeighted(
  space: SpaceCandidate,
  userTagCounts: Partial<Record<string, number>>,
): number {
  return getValidSpaceTagLinks(space).reduce((sum, l) => sum + (userTagCounts[l.tag.id] ?? 0), 0);
}

/** 태그 겹침 기반 CBF 점수 (0~1), userTopTagIds는 Tag.id 목록 */
export function scoreSpace(space: SpaceCandidate, userTopTagIds: string[]): number {
  const ids = getValidSpaceTagLinks(space).map((l) => l.tag.id);
  if (userTopTagIds.length === 0 || ids.length === 0) return 0;
  const overlap = userTopTagIds.filter((id) => ids.includes(id)).length;
  const maxLen = Math.max(userTopTagIds.length, ids.length, 1);
  return overlap / maxLen;
}

/** 추천 이유 문구 생성 — 태그 이름은 공간 자신의 SpaceTag 링크에서 그대로 가져온다(별도 조회 불필요). */
export function getRecommendReason(space: SpaceCandidate, userTopTagIds: string[]): string {
  const matched = getValidSpaceTagLinks(space).filter((l) => userTopTagIds.includes(l.tag.id));
  if (matched.length === 0) return "";
  if (matched.length === 1) return `${matched[0].tag.name} 공간을 자주 기록하셨습니다.`;
  const labels = matched.slice(0, 2).map((l) => l.tag.name);
  return `${labels.join(", ")} 태그가 최근 기록과 비슷합니다.`;
}

/** 취향 기반 추천 공간 목록 (상위 N개) */
export function rankSpaces(
  candidates: SpaceCandidate[],
  userTopTagIds: string[],
  limit = 3,
): SpaceCandidate[] {
  return candidates
    .map((s) => ({ space: s, score: scoreSpace(s, userTopTagIds) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ space }) => space);
}

/* ── tasteScore × SpaceTag.weight 가중치 추천 (Tag.id 키) ──────────────────
   사용자가 높은 점수를 준 공간의 태그일수록 취향 벡터에서 더 큰 가중치.
   예) 공간A [조용한,사색적인] 5점 + 공간C [따뜻한,조용한] 4점
       → 조용한 9, 사색적인 5, 따뜻한 4                                   */

export type TasteVector = Partial<Record<string, number>>;

export interface WeightedVectorRecord extends SpaceVisitRecord {
  tasteScore: number | null;
  space: {
    spaceTagLinks?: (SpaceTagLinkLike & { weight: number })[];
  };
}

/**
 * 기록 목록 → tasteScore × SpaceTag.weight 가중 취향 벡터(Tag.id 기준).
 * "같은 공간에 대한 취향은 누적하지 않고, 가장 최근의 감정으로 갱신한다" — 같은 공간을 여러 번
 * 방문했어도 getLatestRecordPerSpace로 공간당 최신 기록 1개만 반영한다(재방문 점수 누적 금지).
 */
export function buildWeightedTasteVector(records: WeightedVectorRecord[]): TasteVector {
  const vector: TasteVector = {};
  for (const r of getLatestRecordPerSpace(records)) {
    const score = r.tasteScore ?? 3; // 점수 없는 레거시 기록은 중립 가중치
    for (const link of getValidSpaceTagLinks(r.space) as (SpaceTagLinkLike & { weight: number })[]) {
      vector[link.tag.id] = (vector[link.tag.id] ?? 0) + score * link.weight;
    }
  }
  return vector;
}

/** 벡터 상위 태그 목록 ([tagId, weight][] 내림차순) */
export function vectorTopTags(vector: TasteVector): [string, number][] {
  return (Object.entries(vector) as [string, number][]).sort((a, b) => b[1] - a[1]);
}

/** 벡터 기반 추천: 겹치는 태그 가중치 합산, 점수 높은 순 상위 N개 (0점 제외) */
export function rankSpacesByVector<T extends { spaceTagLinks?: SpaceTagLinkLike[] }>(
  candidates: T[],
  vector: TasteVector,
  limit = 3,
): (T & { score: number })[] {
  return candidates
    .map((s) => ({ ...s, score: getValidSpaceTagLinks(s).reduce((sum, l) => sum + (vector[l.tag.id] ?? 0), 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 벡터 기반 추천 이유 — 기술적 느낌 없이 "결이 닮은" 문장으로 */
export function getVectorReason(space: { spaceTagLinks?: SpaceTagLinkLike[] }, vector: TasteVector): string {
  const matched = getValidSpaceTagLinks(space)
    .filter((l) => (vector[l.tag.id] ?? 0) > 0)
    .sort((a, b) => (vector[b.tag.id] ?? 0) - (vector[a.tag.id] ?? 0))
    .slice(0, 2);
  if (matched.length === 0) return "당신이 좋아한 공간들의 분위기와 가장 가까운 공간이에요.";
  const labels = matched.map((l) => `'${l.tag.name}'`).join(", ");
  return `최근 높은 점수를 준 공간들과 ${labels} 결이 닮아 있어요.`;
}

/* ── 사용자 간 취향 유사도 (코사인) — '내 취향과 닮은 사람' 추천용 ────────
   두 태그 가중치 벡터(TasteVector)의 방향이 얼마나 비슷한지를 0~1로 나타낸다.
   벡터 크기(방문 횟수·점수 총합)가 달라도 "분포 모양"이 비슷하면 높은 점수가 나온다. */

/** 코사인 유사도 (0~1, 겹치는 태그가 전혀 없으면 0) */
export function cosineSimilarity(a: TasteVector, b: TasteVector): number {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** 유사도 점수를 숫자 대신 담백한 문장으로 */
export function getSimilarityPhrase(score: number): string {
  if (score >= 0.85) return "당신과 취향이 매우 닮았습니다.";
  if (score >= 0.6) return "당신과 취향이 많이 닮았습니다.";
  if (score >= 0.35) return "당신과 결이 비슷합니다.";
  return "당신과 취향이 살짝 겹칩니다.";
}
