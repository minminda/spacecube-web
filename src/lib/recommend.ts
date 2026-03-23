import { Tag } from "@prisma/client";

/** Haversine 공식으로 두 좌표 간 거리(km) 계산 */
export function haversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface SpaceCandidate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  imageUrl: string | null;
  type: string;
  district: string | null;
  spaceTags: Tag[];
  lat: number | null;
  lng: number | null;
}

/**
 * 공간 추천 스코어 계산
 *
 * mode = "similar"  → 취향 일치도 높은 순
 * mode = "diverse"  → 취향이 다른 순 (새로운 발견)
 *
 * 가중치:
 *   좌표 있을 때 : 태그 60% + 거리 40%
 *   좌표 없을 때 : 태그 100%
 */
export function scoreSpace(
  space: SpaceCandidate,
  userTopTags: Tag[],
  mode: "similar" | "diverse",
  userLat?: number | null,
  userLng?: number | null,
): number {
  if (userTopTags.length === 0) return Math.random(); // 기록 없으면 랜덤

  const spaceTags = space.spaceTags.length > 0 ? space.spaceTags : userTopTags;
  const overlap = userTopTags.filter((t) => spaceTags.includes(t)).length;
  const maxLen = Math.max(userTopTags.length, spaceTags.length, 1);
  const tagSim = overlap / maxLen;
  const tagScore = mode === "diverse" ? 1 - tagSim : tagSim;

  const hasCoords = userLat && userLng && space.lat && space.lng;
  if (!hasCoords) return tagScore;

  const dist = haversine(userLat!, userLng!, space.lat!, space.lng!);
  // 3km 이내 → distScore 1→0 선형 감소
  const distScore = Math.max(0, 1 - dist / 3);

  return tagScore * 0.6 + distScore * 0.4;
}

/** 추천 공간 목록 반환 (상위 N개) */
export function rankSpaces(
  candidates: SpaceCandidate[],
  userTopTags: Tag[],
  mode: "similar" | "diverse",
  limit = 3,
  userLat?: number | null,
  userLng?: number | null,
): SpaceCandidate[] {
  return candidates
    .map((s) => ({ space: s, score: scoreSpace(s, userTopTags, mode, userLat, userLng) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ space }) => space);
}
