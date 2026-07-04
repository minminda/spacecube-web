import Link from "next/link";
import Image from "next/image";
import { Tag } from "@prisma/client";
import { TAG_LABELS } from "@/lib/tags";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  rankSpaces,
  buildTasteVector,
  rankSpacesByVector,
  getVectorReason,
  type SpaceCandidate,
} from "@/lib/recommend";
import { aggregateTags } from "@/lib/taste";
import {
  ENABLE_TASTE_SCORE_RECOMMENDATION,
  ENABLE_RECOMMENDATION_PLAYLIST_UI,
} from "@/lib/features";
import RecommendationPlaylist, { type PlaylistCard } from "@/components/RecommendationPlaylist";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ name?: string; tags?: string; score?: string }>;
}

const SCORE_MESSAGES: Record<number, string> = {
  5: "이 공간은 당신의 취향에 꼭 맞았네요.",
  4: "이 공간은 당신의 취향과 꽤 가까웠어요.",
  3: "무난하게 맞는 공간이었어요.",
  2: "이번 공간은 조금 아쉬웠네요.",
  1: "취향과는 거리가 있었네요. 다음 공간을 찾아볼게요.",
};

export default async function DonePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { name, tags, score } = await searchParams;

  const spaceName = name ? decodeURIComponent(name) : "이 공간";
  const tagList = tags ? (tags.split(",").filter((t) => t in TAG_LABELS) as Tag[]) : [];
  const scoreNum = score ? parseInt(score, 10) : null;
  const tasteScore = scoreNum && scoreNum >= 1 && scoreNum <= 5 ? scoreNum : null;

  let playlistCards: PlaylistCard[] = [];
  let legacyRecommended: SpaceCandidate[] = [];

  const session = await auth();
  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, district: true, spaceTags: true },
  });

  if (space && session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const userRecords = await prisma.record.findMany({
        where: { userId: user.id },
        include: { tags: true, space: { select: { spaceTags: true } } },
      });
      const visitedIds = new Set(userRecords.map((r) => r.spaceId));

      const candidateSelect = {
        id: true, name: true, slug: true, tagline: true,
        imageUrl: true, type: true, district: true, spaceTags: true,
      } as const;

      // 같은 지역 우선 → 없으면 전체로 확장
      let candidates = await prisma.space.findMany({
        where: { isActive: true, id: { notIn: [...visitedIds] }, ...(space.district ? { district: space.district } : {}) },
        select: candidateSelect,
        take: 30,
      });

      if (ENABLE_TASTE_SCORE_RECOMMENDATION) {
        // tasteScore 가중 벡터 기반 추천
        const vector = buildTasteVector(userRecords);
        let ranked = rankSpacesByVector(candidates, vector, 3);
        if (ranked.length === 0 && space.district) {
          candidates = await prisma.space.findMany({
            where: { isActive: true, id: { notIn: [...visitedIds] } },
            select: candidateSelect,
            take: 30,
          });
          ranked = rankSpacesByVector(candidates, vector, 3);
        }
        playlistCards = ranked.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          district: s.district,
          imageUrl: s.imageUrl,
          tagLabels: s.spaceTags.slice(0, 3).map((t) => TAG_LABELS[t]),
          reason: getVectorReason(s, vector),
        }));
      } else {
        // 레거시: 태그 겹침 기반 추천 (보존)
        const userTopTags = aggregateTags(userRecords).slice(0, 3).map(([t]) => t);
        const effectiveTags = userTopTags.length > 0 ? userTopTags : tagList;
        legacyRecommended = rankSpaces(candidates, effectiveTags, 2);
        if (legacyRecommended.length === 0 && space.district) {
          const broader = await prisma.space.findMany({
            where: { isActive: true, id: { notIn: [...visitedIds] } },
            select: candidateSelect,
            take: 20,
          });
          legacyRecommended = rankSpaces(broader, effectiveTags, 2);
        }
      }
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 pt-16 pb-12 gap-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>아카이브에 저장됐어.</p>
        <h1 className="text-2xl font-bold leading-tight">{spaceName}</h1>

        {/* 취향 적합도 결과 */}
        {tasteScore !== null && (
          <div className="space-y-1.5 pt-1">
            <p className="text-sm font-medium">취향 적합도 {tasteScore}/5</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className="h-1 flex-1"
                  style={{ background: n <= tasteScore ? "var(--fg)" : "var(--border)" }}
                />
              ))}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
              {SCORE_MESSAGES[tasteScore]}
            </p>
          </div>
        )}

        {/* 레거시: 선택한 태그 표시 */}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tagList.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 추천: 플레이리스트 UX */}
      {ENABLE_RECOMMENDATION_PLAYLIST_UI && playlistCards.length > 0 && (
        <>
          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
                내 취향과 닮은 공간
              </p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                높은 점수를 남긴 공간들의 결을 바탕으로 골랐어요.
              </p>
            </div>
            <RecommendationPlaylist cards={playlistCards} />
          </section>
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </>
      )}

      {/* 레거시: 정적 리스트 (플래그 복구용 보존) */}
      {!ENABLE_RECOMMENDATION_PLAYLIST_UI && legacyRecommended.length > 0 && (
        <>
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
              당신의 취향과 닮은 공간
            </p>
            {legacyRecommended.map((rec) => (
              <Link key={rec.id} href={`/space/${rec.slug}`} className="flex gap-4 group">
                {rec.imageUrl && (
                  <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden">
                    <Image src={rec.imageUrl} alt={rec.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                )}
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:underline">{rec.name}</p>
                  {rec.tagline && (
                    <p className="text-xs truncate leading-relaxed" style={{ color: "var(--dim)" }}>{rec.tagline}</p>
                  )}
                  {rec.district && (
                    <p className="text-xs" style={{ color: "var(--dim)" }}>{rec.district}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </>
      )}

      <div className="space-y-3">
        <Link
          href="/archive"
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          내 아카이브 보기
        </Link>
        <Link href="/" className="block text-xs text-center py-2" style={{ color: "var(--dim)" }}>
          홈으로
        </Link>
      </div>
    </main>
  );
}
