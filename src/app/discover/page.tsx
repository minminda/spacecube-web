import Link from "next/link";
import { TagKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { aggregateTags } from "@/lib/taste";
import {
  scoreSpaceWeighted, getRecommendReason,
  buildTasteVector, vectorTopTags, getVectorReason,
} from "@/lib/recommend";
import { isAdmin } from "@/lib/admin";
import { getUserUnlockSets } from "@/lib/spaceUnlock";
import { ENABLE_TASTE_SCORE_RECOMMENDATION } from "@/lib/features";
import DiscoverEntry, { type DiscoverDistrict } from "../DiscoverEntry";
import SpaceCards from "./SpaceCards";
import SpaceDiscoveryCard from "./SpaceDiscoveryCard";

interface Props {
  searchParams: Promise<{ district?: string }>;
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { district } = await searchParams;

  // district 미지정 — 지역을 고르는 진입 화면 (홈에서 "공간 둘러보기"로 옴)
  if (!district) {
    // HIDDEN 지역은 지도 자체에서 제외 — 관리자 화면(/owner/districts)에만 계속 보인다.
    const districts = await prisma.district.findMany({
      where: { status: { in: ["ACTIVE", "COMING_SOON"] } },
      orderBy: { order: "asc" },
      select: { name: true, status: true, tagline: true, markerX: true, markerY: true, zoomX: true, zoomY: true, zoomScale: true },
    });

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
        <DiscoverEntry districts={districts as DiscoverDistrict[]} />
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
      district: true, spaceTags: true, naverMapUrl: true,
      spaceTagLinks: { include: { tag: true } },
    },
  });

  // ── 사용자 취향 데이터 ────────────────────────────────────────────
  let hasEnoughRecords = false;
  let recordCount = 0;
  let visitedSpaceIds: string[] = [];
  // 카드 잠금 해제 판정 전용 — 취향 점수(Record)가 아니라 실제 Cube QR 스캔으로 생긴
  // SpaceUnlock(마지막 스캔으로부터 12시간 이내) 기준이다. 추천 TOP3와 전체 목록이
  // 이 하나의 집합을 공유한다(SpaceDiscoveryCard 공용 컴포넌트, 페이지별 중복 판정 없음).
  let unlockedSpaceIds: string[] = [];
  let userTopTags: TagKey[] = [];
  let userTagCountMap: Partial<Record<TagKey, number>> = {};

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (user) {
      const [userRecords, unlockSets] = await Promise.all([
        prisma.record.findMany({
          where: { userId: user.id },
          include: { tags: true, space: { select: { spaceTags: true } } },
        }),
        getUserUnlockSets(user.id),
      ]);
      recordCount = userRecords.length;
      // 추천 제외 필터(이미 취향 데이터가 있는 공간)에만 쓰는 방문 집합 — Record 기준 그대로.
      visitedSpaceIds = [...new Set(userRecords.map((r) => r.spaceId))];
      // 관리자는 테스트 편의를 위해 모든 공간을 해제된 것으로 본다(기존 isAdmin 권한 구조 재사용).
      unlockedSpaceIds = isAdmin(session.user.email) ? spacesRaw.map((s) => s.id) : [...unlockSets.unlocked];

      if (recordCount >= 3) {
        hasEnoughRecords = true;
        if (ENABLE_TASTE_SCORE_RECOMMENDATION) {
          // tasteScore 가중 벡터 — 높은 점수를 준 공간의 태그가 더 강하게 반영
          userTagCountMap = buildTasteVector(userRecords);
          userTopTags = vectorTopTags(userTagCountMap).slice(0, 3).map(([t]) => t);
        } else {
          // 레거시: 태그 선택 빈도 기반
          const tagCounts = aggregateTags(userRecords);
          userTagCountMap = Object.fromEntries(tagCounts) as Partial<Record<TagKey, number>>;
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
  const unlockedSet = new Set(unlockedSpaceIds);
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

  // SpaceCards 형태로 변환 (spaceTags·score 제거, 잠금 안내에 필요한 district·naverMapUrl은 유지)
  const spacesForCards = sortedSpaces.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    type: s.type,
    openingHours: s.openingHours,
    imageUrl: s.imageUrl,
    district: s.district,
    naverMapUrl: s.naverMapUrl,
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
          {/* ── 추천 섹션 (기록 3개 이상 + 매칭 공간 있을 때) — 전체 목록과 동일한 SpaceDiscoveryCard로
                 잠금 규칙을 공유한다(카드 표시/다이얼로그 중복 구현 금지). ── */}
          {hasEnoughRecords && recommendedSpaces.length > 0 && (
            <>
              <section className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
                    // 내 취향과 닮은 공간 TOP3
                  </p>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    {ENABLE_TASTE_SCORE_RECOMMENDATION
                      ? "높은 점수를 남긴 공간들의 결을 바탕으로 골랐어요."
                      : "최근 기록한 공간의 태그를 바탕으로 골랐습니다."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {recommendedSpaces.map((rec) => (
                    <SpaceDiscoveryCard
                      key={rec.id}
                      space={{
                        id: rec.id,
                        slug: rec.slug,
                        name: rec.name,
                        type: rec.type,
                        district: rec.district,
                        imageUrl: rec.imageUrl,
                        naverMapUrl: rec.naverMapUrl,
                      }}
                      isUnlocked={unlockedSet.has(rec.id)}
                      variant="recommended"
                      recommendationReason={
                        ENABLE_TASTE_SCORE_RECOMMENDATION
                          ? getVectorReason(rec, userTagCountMap)
                          : getRecommendReason(rec, userTopTags)
                      }
                    />
                  ))}
                </div>
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
          <SpaceCards spaces={spacesForCards} unlockedSpaceIds={unlockedSpaceIds} />
        </>
      )}
    </main>
  );
}
