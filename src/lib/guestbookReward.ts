import { prisma } from "@/lib/prisma";
import { TAG_LABELS } from "@/lib/tags";
import { buildWeightedTasteVector, rankSpacesByVector, getVectorReason, vectorTopTags } from "@/lib/recommend";

export interface RewardTag {
  label: string;
  weight: number;
}

export interface RewardRecommendation {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  imageUrl: string | null;
  matchPercent: number;
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
  recommendationReason: string | null;
  nextEpisode: RewardNextEpisode | null;
}

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  imageUrl: true,
  type: true,
  district: true,
  spaceTags: true,
} as const;

/**
 * 방명록 작성 직후 보여줄 보상 요약을 계산한다.
 * 추천 로직은 기존 done/page.tsx가 쓰던 것(buildWeightedTasteVector + rankSpacesByVector)을
 * 그대로 재사용한다 — 새 추천 알고리즘을 만들지 않는다.
 */
export async function buildRewardSummary(userId: string, spaceId: string): Promise<RewardSummary> {
  const [postitCount, space, userRecords] = await Promise.all([
    prisma.guestbookNote.count({ where: { spaceId } }),
    prisma.space.findUnique({ where: { id: spaceId }, select: { district: true } }),
    prisma.record.findMany({
      where: { userId },
      select: {
        spaceId: true,
        tasteScore: true,
        space: { select: { spaceTags: true, spaceTagLinks: { include: { tag: true } } } },
      },
    }),
  ]);

  const vector = buildWeightedTasteVector(userRecords);
  const topTags: RewardTag[] = vectorTopTags(vector)
    .slice(0, 2)
    .map(([tag, weight]) => ({ label: TAG_LABELS[tag], weight }));
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

  const totalVectorWeight = Object.values(vector).reduce((sum: number, w) => sum + (w ?? 0), 0) || 1;
  const recommendations: RewardRecommendation[] = ranked.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    imageUrl: s.imageUrl,
    matchPercent: Math.min(99, Math.max(1, Math.round((s.score / totalVectorWeight) * 100))),
  }));
  const recommendationReason = ranked.length > 0 ? getVectorReason(ranked[0], vector) : null;

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

  return { postitCount, topTags, tasteHighlight, recommendations, recommendationReason, nextEpisode };
}
