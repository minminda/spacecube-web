import Link from "next/link";
import Image from "next/image";
import { Tag } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { aggregateTags } from "@/lib/taste";
import {
  scoreSpaceWeighted, getRecommendReason,
  buildTasteVector, vectorTopTags, getVectorReason,
} from "@/lib/recommend";
import { TAG_LABELS } from "@/lib/tags";
import {
  ENABLE_TASTE_SCORE_RECOMMENDATION,
  ENABLE_RECOMMENDATION_PLAYLIST_UI,
} from "@/lib/features";
import RecommendationPlaylist from "@/components/RecommendationPlaylist";
import DiscoverEntry from "../DiscoverEntry";
import SpaceCards from "./SpaceCards";

interface Props {
  searchParams: Promise<{ district?: string }>;
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { district } = await searchParams;

  // district 미지정 — 지역을 고르는 진입 화면 (홈에서 "공간 둘러보기"로 옴)
  if (!district) {
    return (
      <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
        <nav className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        </nav>
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간 둘러보기</p>
          <h1 className="text-2xl font-bold">어디로 갈까</h1>
        </div>
        <DiscoverEntry />
      </main>
    );
  }

  const session = await auth();

  // ── 공간 목록 조회 (spaceTags, district 포함) ──────────────────────
  const spacesRaw = await prisma.space.findMany({
    where: { district, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, name: true, tagline: true,
      type: true, openingHours: true, imageUrl: true,
      district: true, spaceTags: true,
    },
  });

  // ── 사용자 취향 데이터 ────────────────────────────────────────────
  let hasEnoughRecords = false;
  let recordCount = 0;
  let visitedSpaceIds: string[] = [];
  let userTopTags: Tag[] = [];
  let userTagCountMap: Partial<Record<Tag, number>> = {};

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (user) {
      const userRecords = await prisma.record.findMany({
        where: { userId: user.id },
        include: { tags: true, space: { select: { spaceTags: true } } },
      });
      recordCount = userRecords.length;
      // 방문한 공간 ID (중복 제거)
      visitedSpaceIds = [...new Set(userRecords.map((r) => r.spaceId))];

      if (recordCount >= 3) {
        hasEnoughRecords = true;
        if (ENABLE_TASTE_SCORE_RECOMMENDATION) {
          // tasteScore 가중 벡터 — 높은 점수를 준 공간의 태그가 더 강하게 반영
          userTagCountMap = buildTasteVector(userRecords);
          userTopTags = vectorTopTags(userTagCountMap).slice(0, 3).map(([t]) => t);
        } else {
          // 레거시: 태그 선택 빈도 기반
          const tagCounts = aggregateTags(userRecords);
          userTagCountMap = Object.fromEntries(tagCounts) as Partial<Record<Tag, number>>;
          userTopTags = tagCounts.slice(0, 3).map(([t]) => t);
        }
      }
    }
  }

  // ── 각 공간에 점수 부여 ───────────────────────────────────────────
  const spacesWithScore = spacesRaw.map((s) => ({
    ...s,
    score: hasEnoughRecords ? scoreSpaceWeighted(s, userTagCountMap) : 0,
  }));

  // ── 추천 섹션: 방문하지 않은 공간, 점수 > 0, 상위 3개 ─────────────
  const visitedSet = new Set(visitedSpaceIds);
  const recommendedSpaces = hasEnoughRecords
    ? [...spacesWithScore]
        .filter((s) => !visitedSet.has(s.id) && s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : [];

  // ── 전체 공간 리스트: 기록 3개 이상이면 점수 기반 정렬 ──────────────
  const sortedSpaces = hasEnoughRecords
    ? [...spacesWithScore].sort((a, b) => b.score - a.score)
    : spacesWithScore;

  // SpaceCards 형태로 변환 (spaceTags·district·score 제거)
  const spacesForCards = sortedSpaces.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    type: s.type,
    openingHours: s.openingHours,
    imageUrl: s.imageUrl,
  }));

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <nav className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
      </nav>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>지금 탐험할 지역</p>
        <h1 className="text-3xl font-bold">{district}</h1>
      </div>

      {spacesRaw.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 {district}에 등록된 공간이 없어. 조금 기다려봐.
          </p>
          <Link href="/" className="text-sm" style={{ color: "var(--dim)" }}>다른 지역 보기 →</Link>
        </div>
      ) : (
        <>
          {/* ── 추천 섹션 (기록 3개 이상 + 매칭 공간 있을 때) ── */}
          {hasEnoughRecords && recommendedSpaces.length > 0 && (
            <>
              <section className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
                    // 내 취향과 닮은 공간
                  </p>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    {ENABLE_TASTE_SCORE_RECOMMENDATION
                      ? "높은 점수를 남긴 공간들의 결을 바탕으로 골랐어요."
                      : "최근 기록한 공간의 태그를 바탕으로 골랐습니다."}
                  </p>
                </div>

                {ENABLE_RECOMMENDATION_PLAYLIST_UI ? (
                  <RecommendationPlaylist
                    cards={recommendedSpaces.map((rec) => ({
                      id: rec.id,
                      slug: rec.slug,
                      name: rec.name,
                      district: rec.district,
                      imageUrl: rec.imageUrl,
                      tagLabels: rec.spaceTags.slice(0, 3).map((t) => TAG_LABELS[t]),
                      reason: ENABLE_TASTE_SCORE_RECOMMENDATION
                        ? getVectorReason(rec, userTagCountMap)
                        : getRecommendReason(rec, userTopTags),
                    }))}
                  />
                ) : (
                  /* 레거시: 정적 리스트 (플래그 복구용 보존) */
                  <div className="space-y-5">
                    {recommendedSpaces.map((rec) => {
                      const reason = getRecommendReason(rec, userTopTags);
                      return (
                        <Link
                          key={rec.id}
                          href={`/space/${rec.slug}`}
                          className="flex gap-4 group"
                        >
                          {rec.imageUrl && (
                            <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden">
                              <Image
                                src={rec.imageUrl}
                                alt={rec.name}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                          )}
                          <div className="flex flex-col justify-center gap-0.5 min-w-0">
                            <p className="text-sm font-semibold truncate group-hover:underline">
                              {rec.name}
                            </p>
                            {rec.tagline && (
                              <p className="text-xs truncate" style={{ color: "var(--dim)" }}>
                                {rec.tagline}
                              </p>
                            )}
                            {reason && (
                              <p className="text-xs" style={{ color: "var(--dim)" }}>{reason}</p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
              <div style={{ borderTop: "1px solid var(--border)" }} />
            </>
          )}

          {/* ── 전체 공간 리스트 ── */}
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
              {spacesForCards.length}곳 발견
            </p>
            {hasEnoughRecords && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                당신의 취향과 닮은 순으로 정렬되었습니다.
              </p>
            )}
            {session && !hasEnoughRecords && recordCount > 0 && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                공간 {recordCount}/3을 기록하면 취향과 닮은 공간을 먼저 보여드립니다.
              </p>
            )}
          </div>
          <SpaceCards spaces={spacesForCards} visitedSpaceIds={visitedSpaceIds} />
        </>
      )}
    </main>
  );
}
