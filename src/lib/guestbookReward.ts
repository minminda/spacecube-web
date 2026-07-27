import { prisma } from "@/lib/prisma";
import { buildWeightedTasteVector, rankSpacesByVector, getVectorReason, vectorTopTags } from "@/lib/recommend";
import { getUserUnlockSets } from "@/lib/spaceUnlock";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";

export interface RewardTag {
  label: string;
  weight: number;
}

export interface RewardRecommendation {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  type: string;
  district: string | null;
  naverMapUrl: string | null;
  /** 이 공간에 한정된 개별 추천 이유 — 이전에는 랭킹 1위에 대해서만 섹션 전체 공용으로 계산했다. */
  reason: string;
  /** 현재 이 사용자의 12시간 접근 권한이 없는 공간인지 — 카드가 상세 페이지로 바로 이동할지, 잠금 안내를 보여줄지 분기한다. */
  locked: boolean;
}

export interface RewardNextEpisode {
  episodeNumber: number;
  title: string | null;
}

export interface RewardSummary {
  postitCount: number;
  topTags: RewardTag[];
  tasteHighlight: string | null;
  recommendations: RewardRecommendation[];
  nextEpisode: RewardNextEpisode | null;
}

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
  type: true,
  district: true,
  naverMapUrl: true,
  spaceTags: true,
  spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
} as const;

/**
 * 방명록 작성 직후 보여줄 보상 요약을 계산한다.
 * 추천 로직은 기존 done/page.tsx가 쓰던 것(buildWeightedTasteVector + rankSpacesByVector)을
 * 그대로 재사용한다 — 새 추천 알고리즘을 만들지 않는다. 카드 표시 정보(잠금 상태·개별 이유)만
 * 새로 붙인다.
 */
export async function buildRewardSummary(userId: string, spaceId: string): Promise<RewardSummary> {
  const [postitCount, space, userRecords, unlockSets] = await Promise.all([
    prisma.guestbookNote.count({ where: { spaceId } }),
    prisma.space.findUnique({ where: { id: spaceId }, select: { district: true } }),
    prisma.record.findMany({
      where: { userId },
      select: {
        id: true,
        spaceId: true,
        visitedAt: true,
        tasteScore: true,
        space: { select: { spaceTags: true, spaceTagLinks: { include: { tag: true } } } },
      },
    }),
    getUserUnlockSets(userId),
  ]);

  const vector = buildWeightedTasteVector(userRecords);
  const tagNameById = new Map(userRecords.flatMap((r) => r.space.spaceTagLinks.map((l) => [l.tag.id, l.tag.name] as const)));
  const topTags: RewardTag[] = vectorTopTags(vector)
    .slice(0, 2)
    .map(([tagId, weight]) => ({ label: tagNameById.get(tagId) ?? tagId, weight }));
  const tasteHighlight = topTags.length > 0 ? `이번 기록으로 '${topTags[0].label}' 취향이 조금 더 선명해졌습니다.` : null;

  const visitedIds = new Set(userRecords.map((r) => r.spaceId));
  let candidates = await prisma.space.findMany({
    where: { isActive: true, id: { notIn: [...visitedIds] }, ...(space?.district ? { district: space.district } : {}) },
    select: CANDIDATE_SELECT,
    take: 30,
  });
  let ranked = rankSpacesByVector(candidates, vector, 3);
  if (ranked.length === 0 && space?.district) {
    candidates = await prisma.space.findMany({
      where: { isActive: true, id: { notIn: [...visitedIds] } },
      select: CANDIDATE_SELECT,
      take: 30,
    });
    ranked = rankSpacesByVector(candidates, vector, 3);
  }

  const recommendations: RewardRecommendation[] = ranked.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    imageUrl: s.imageUrl,
    type: resolveSpaceTypeLabel(s.spaceTagLinks, s.type),
    district: s.district,
    naverMapUrl: s.naverMapUrl,
    reason: getVectorReason(s, vector),
    locked: !unlockSets.unlocked.has(s.id),
  }));

  const episodes = await prisma.episode.findMany({
    where: { spaceId, published: true },
    orderBy: { displayOrder: "asc" },
    select: { episodeNumber: true, title: true, unlockVisitCount: true },
  });
  const visitCount = await prisma.record.count({ where: { userId, spaceId } });
  const nextLocked = episodes.find((e) => e.unlockVisitCount > visitCount);
  const nextEpisode: RewardNextEpisode | null = nextLocked
    ? { episodeNumber: nextLocked.episodeNumber, title: nextLocked.title }
    : episodes.length > 0
      ? { episodeNumber: episodes[episodes.length - 1].episodeNumber + 1, title: null }
      : null;

  return { postitCount, topTags, tasteHighlight, recommendations, nextEpisode };
}
