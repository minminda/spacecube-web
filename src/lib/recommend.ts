import { TagKey } from "@prisma/client";
import { TAG_LABELS } from "@/lib/tags";
import { getLatestRecordPerSpace, type SpaceVisitRecord } from "@/lib/taste";

/** 공간-태그 연결(신규 SpaceTag) 한 건의 최소 형태 — recommend.ts 전역에서 공유. */
export interface SpaceTagLinkLike {
  tag: { legacyKey: TagKey | null; isActive: boolean; useForRecommendation: boolean };
}

export interface SpaceCandidate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  imageUrl: string | null;
  type: string;
  district: string | null;
  spaceTags: TagKey[];
  /** 관리자가 연결한 신규 태그(SpaceTag) — 있으면 이쪽을 우선 쓰고 없으면 spaceTags로 폴백. */
  spaceTagLinks?: SpaceTagLinkLike[];
}

/** 유효한 SpaceTag 연결만 남긴다(비활성/추천제외/레거시 매핑 없는 신규 태그 제외). */
function getValidSpaceTagLinks(space: { spaceTagLinks?: SpaceTagLinkLike[] }): SpaceTagLinkLike[] {
  return (space.spaceTagLinks ?? []).filter(
    (l) => l.tag.isActive && l.tag.useForRecommendation && l.tag.legacyKey,
  );
}

/**
 * 공간의 "유효 태그 목록"을 계산한다 — 관리자가 SpaceTag(신규)를 연결해두면 그 legacyKey들을
 * 쓰고, 아직 연결이 없으면 레거시 spaceTags 배열로 폴백한다. buildWeightedTasteVector가 쓰던
 * 폴백 규칙을 후보 공간 스코어링 함수들(scoreSpace 계열)도 동일하게 따르도록 하나로 모았다 —
 * 백필로 SpaceTag가 채워지는 공간부터 자동으로 신규 시스템이 우선 적용된다.
 */
function resolveEffectiveTagKeys(space: { spaceTags: TagKey[]; spaceTagLinks?: SpaceTagLinkLike[] }): TagKey[] {
  const links = getValidSpaceTagLinks(space);
  return links.length > 0 ? links.map((l) => l.tag.legacyKey as TagKey) : space.spaceTags;
}

/**
 * 빈도 가중 CBF 점수 — 사용자가 많이 선택한 태그일수록 높은 점수
 * 예) 사용자: {QUIET:3, FOCUSED:2} / 공간: [QUIET, FOCUSED] → 점수 = 5
 */
export function scoreSpaceWeighted(
  space: SpaceCandidate,
  userTagCounts: Partial<Record<TagKey, number>>,
): number {
  return resolveEffectiveTagKeys(space).reduce((sum, tag) => sum + (userTagCounts[tag] ?? 0), 0);
}

/** 태그 겹침 기반 CBF 점수 (0~1) */
export function scoreSpace(space: SpaceCandidate, userTopTags: TagKey[]): number {
  const tags = resolveEffectiveTagKeys(space);
  if (userTopTags.length === 0 || tags.length === 0) return 0;
  const overlap = userTopTags.filter((t) => tags.includes(t)).length;
  const maxLen = Math.max(userTopTags.length, tags.length, 1);
  return overlap / maxLen;
}

/** 추천 이유 문구 생성 */
export function getRecommendReason(space: SpaceCandidate, userTopTags: TagKey[]): string {
  const matched = userTopTags.filter((t) => resolveEffectiveTagKeys(space).includes(t));
  if (matched.length === 0) return "";
  if (matched.length === 1) return `${TAG_LABELS[matched[0]]} 공간을 자주 기록하셨습니다.`;
  const labels = matched.slice(0, 2).map((t) => TAG_LABELS[t]);
  return `${labels.join(", ")} 태그가 최근 기록과 비슷합니다.`;
}

/** 취향 기반 추천 공간 목록 (상위 N개) */
export function rankSpaces(
  candidates: SpaceCandidate[],
  userTopTags: TagKey[],
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

export type TasteVector = Partial<Record<TagKey, number>>;

export interface VectorRecord extends SpaceVisitRecord {
  tasteScore: number | null;
  tags: { tag: TagKey }[]; // 레거시 RecordTag (spaceTags 없을 때 fallback)
  space: { spaceTags: TagKey[] };
}

/**
 * 기록 목록 → tasteScore 가중 취향 벡터.
 * "같은 공간에 대한 취향은 누적하지 않고, 가장 최근의 감정으로 갱신한다" — 같은 공간을 여러 번
 * 방문했어도 getLatestRecordPerSpace로 공간당 최신 기록 1개만 반영한다(재방문 점수 누적 금지).
 */
export function buildTasteVector(records: VectorRecord[]): TasteVector {
  const vector: TasteVector = {};
  for (const r of getLatestRecordPerSpace(records)) {
    const tags = r.space.spaceTags.length > 0 ? r.space.spaceTags : r.tags.map((t) => t.tag);
    const weight = r.tasteScore ?? 3; // 점수 없는 레거시 기록은 중립 가중치
    for (const tag of tags) {
      vector[tag] = (vector[tag] ?? 0) + weight;
    }
  }
  return vector;
}

/** 벡터 상위 태그 목록 ([TagKey, weight][] 내림차순) */
export function vectorTopTags(vector: TasteVector): [TagKey, number][] {
  return (Object.entries(vector) as [TagKey, number][]).sort((a, b) => b[1] - a[1]);
}

/** 벡터 기반 추천: 겹치는 태그 가중치 합산, 점수 높은 순 상위 N개 (0점 제외) */
export function rankSpacesByVector<T extends { spaceTags: TagKey[]; spaceTagLinks?: SpaceTagLinkLike[] }>(
  candidates: T[],
  vector: TasteVector,
  limit = 3,
): (T & { score: number })[] {
  return candidates
    .map((s) => ({ ...s, score: resolveEffectiveTagKeys(s).reduce((sum, t) => sum + (vector[t] ?? 0), 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 벡터 기반 추천 이유 — 기술적 느낌 없이 "결이 닮은" 문장으로 */
export function getVectorReason(space: { spaceTags: TagKey[]; spaceTagLinks?: SpaceTagLinkLike[] }, vector: TasteVector): string {
  const matched = resolveEffectiveTagKeys(space)
    .filter((t) => (vector[t] ?? 0) > 0)
    .sort((a, b) => (vector[b] ?? 0) - (vector[a] ?? 0))
    .slice(0, 2);
  if (matched.length === 0) return "당신이 좋아한 공간들의 분위기와 가장 가까운 공간이에요.";
  const labels = matched.map((t) => `'${TAG_LABELS[t]}'`).join(", ");
  return `최근 높은 점수를 준 공간들과 ${labels} 결이 닮아 있어요.`;
}

/* ── 관리자 태그 가중치(SpaceTag.weight) 반영 취향 벡터 ─────────────────
   기존 buildTasteVector를 대체하지 않고 확장한다. 공간에 SpaceTag 연결이
   있으면 가중치를 곱해서 반영하고(예: 조용한 weight 1.0 → tasteScore*1.0),
   아직 관리자가 태그를 연결하지 않은 공간은 기존 spaceTags 배열(가중치 1)로
   자연스럽게 폴백해 기존 기록 기반 추천이 계속 동작한다.
   결과 타입은 기존 TasteVector(TagKey 기준)와 동일해 rankSpacesByVector,
   getVectorReason 등 기존 함수를 그대로 재사용할 수 있다.
──────────────────────────────────────────────────────────────────── */

export interface WeightedVectorRecord extends SpaceVisitRecord {
  tasteScore: number | null;
  space: {
    spaceTags: TagKey[]; // 레거시 폴백
    spaceTagLinks?: (SpaceTagLinkLike & { weight: number })[];
  };
}

/**
 * 기록 목록 → 태그 가중치(SpaceTag.weight)까지 반영한 취향 벡터.
 * buildTasteVector와 동일하게 같은 공간은 최신 기록 1개만 반영한다(재방문 점수 누적 금지).
 */
export function buildWeightedTasteVector(records: WeightedVectorRecord[]): TasteVector {
  const vector: TasteVector = {};
  for (const r of getLatestRecordPerSpace(records)) {
    const score = r.tasteScore ?? 3; // 점수 없는 레거시 기록은 중립 가중치
    const links = getValidSpaceTagLinks(r.space);
    if (links.length > 0) {
      for (const link of links as (SpaceTagLinkLike & { weight: number })[]) {
        const key = link.tag.legacyKey as TagKey;
        vector[key] = (vector[key] ?? 0) + score * link.weight;
      }
    } else {
      // 아직 SpaceTag가 연결되지 않은 공간 — 기존 방식(가중치 1)으로 폴백
      for (const tag of r.space.spaceTags) {
        vector[tag] = (vector[tag] ?? 0) + score;
      }
    }
  }
  return vector;
}

/* ── 사용자 간 취향 유사도 (코사인) — '내 취향과 닮은 사람' 추천용 ────────
   두 태그 가중치 벡터(TasteVector)의 방향이 얼마나 비슷한지를 0~1로 나타낸다.
   벡터 크기(방문 횟수·점수 총합)가 달라도 "분포 모양"이 비슷하면 높은 점수가 나온다. */

/** 코사인 유사도 (0~1, 겹치는 태그가 전혀 없으면 0) */
export function cosineSimilarity(a: TasteVector, b: TasteVector): number {
  const keys = new Set<TagKey>([...Object.keys(a), ...Object.keys(b)] as TagKey[]);
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
