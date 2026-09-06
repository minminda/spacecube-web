import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import TasteProfileCard from "@/components/TasteProfileCard";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import {
  rankSpaces, getRecommendReason,
  buildWeightedTasteVector, vectorTopTags, rankSpacesByVector, getVectorReason, getMatchPercent,
  cosineSimilarity, getSimilarityPhrase, visibleTagNames,
} from "@/lib/recommend";
import {
  ENABLE_TASTE_SCORE_RECOMMENDATION,
  ENABLE_RECOMMENDATION_PLAYLIST_UI,
  ENABLE_SIMILAR_TASTE_PEOPLE_UI,
} from "@/lib/features";
import RecommendationPlaylist, { type PlaylistCard } from "@/components/RecommendationPlaylist";
import ArchiveBottomNav from "@/components/archive/ArchiveBottomNav";
import Divider from "@/components/Divider";
import { isAdminDemoSession, ADMIN_DEMO_TOP3_SLUGS } from "@/lib/adminDemo";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "var(--dim)" }}>{children}</p>;
}

const MIN_RECORDS_FOR_SIMILARITY = 2; // 취향 데이터가 지나치게 부족한 사용자 제외 기준

export default async function ArchiveTastePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: { include: { spaceTagLinks: { include: { tag: true } } } }, tags: true },
      },
      savedTastes: {
        orderBy: { savedAt: "desc" },
        include: {
          target: {
            include: {
              records: {
                orderBy: { visitedAt: "desc" },
                include: { space: { select: { id: true, name: true, slug: true } }, tags: true },
              },
            },
          },
        },
      },
    },
  });
  if (!user) redirect("/login");

  // 한이음 시연 영상용 관리자 데모 — 실제 취향 계산과 무관하게 TOP3를 고정 노출한다(§adminDemo.ts).
  // 일반 사용자에게는 절대 적용되지 않는다.
  const demo = isAdminDemoSession(session.user.email);

  const allRecords = user.records;

  const header = (
    <nav className="flex justify-between items-center mb-10">
      <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>← 공간 노트</Link>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>내 취향</p>
    </nav>
  );

  if (allRecords.length === 0 && !demo) {
    return (
      <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
        {header}
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          아직 기록이 없어요. 공간 노트에서 첫 기록을 남기면 취향 분석이 시작됩니다
        </p>
        <div className="flex-1" />
        <ArchiveBottomNav />
      </main>
    );
  }

  // 취향 프로파일: tasteScore × 태그 가중치 벡터(신규, Tag.id 기준) 또는 태그 빈도(레거시 TagKey, 플래그 복구용 보존)
  const tasteVector = ENABLE_TASTE_SCORE_RECOMMENDATION ? buildWeightedTasteVector(allRecords) : null;
  const allTags: [string, number][] = tasteVector ? vectorTopTags(tasteVector) : aggregateTags(allRecords);
  const topTags = allTags.slice(0, 5);
  const myTopTagList = topTags.slice(0, 3).map(([t]) => t);

  const tagNameById = new Map(
    allRecords.flatMap((r) => r.space.spaceTagLinks.map((l) => [l.tag.id, l.tag.name] as const)),
  );
  const topTagsWithNames = topTags.map(([id, weight]) => ({
    name: tagNameById.get(id) ?? TAG_LABELS[id as keyof typeof TAG_LABELS] ?? id,
    weight,
  }));
  const tastePhrase = getTastePhrase(topTagsWithNames);

  const visitedIds = new Set(allRecords.map((r) => r.space.id));
  const savedTargetIds = new Set(user.savedTastes.map((st) => st.targetUserId));

  const [recommendCandidates, similarCandidates, demoTop3Spaces] = await Promise.all([
    !demo && allRecords.length >= 3 && myTopTagList.length > 0
      ? prisma.space.findMany({
          where: { isActive: true, id: { notIn: [...visitedIds] } },
          select: {
            id: true, name: true, slug: true, tagline: true, imageUrl: true, type: true, district: true,
            spaceTagLinks: { include: { tag: true } },
          },
          take: 30,
        })
      : Promise.resolve([]),
    ENABLE_SIMILAR_TASTE_PEOPLE_UI && allRecords.length >= 3
      ? prisma.user.findMany({
          where: { visibility: "PARTIAL", id: { not: user.id, notIn: [...savedTargetIds] }, records: { some: {} } },
          select: {
            id: true,
            nickname: true,
            records: {
              orderBy: { visitedAt: "desc" },
              include: {
                tags: true,
                space: { select: { id: true, name: true, slug: true, spaceTagLinks: { include: { tag: true } } } },
              },
            },
          },
          take: 50,
        })
      : Promise.resolve([]),
    demo
      ? prisma.space.findMany({
          where: { slug: { in: [...ADMIN_DEMO_TOP3_SLUGS] } },
          select: { id: true, name: true, slug: true, imageUrl: true, district: true, spaceTagLinks: { include: { tag: true } } },
        })
      : Promise.resolve([]),
  ]);

  const recommended = tasteVector
    ? rankSpacesByVector(recommendCandidates, tasteVector, 3)
    : rankSpaces(recommendCandidates, myTopTagList, 3);

  const playlistCards: PlaylistCard[] = tasteVector
    ? recommended.map((s, i) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        district: s.district,
        imageUrl: s.imageUrl,
        tagLabels: visibleTagNames(s.spaceTagLinks ?? []),
        reason: getVectorReason(s, tasteVector),
        rank: i + 1,
        matchPercent: getMatchPercent(s, tasteVector),
      }))
    : [];

  // 관리자 데모 TOP3 — ADMIN_DEMO_TOP3_SLUGS 순서 그대로, 실제 취향 계산 결과를 대체한다.
  // matchPercent/reason은 실제로 계산된 값이 아니므로 지어내지 않는다(임의 수치 생성 금지 원칙).
  const orderedDemoTop3 = demo
    ? ADMIN_DEMO_TOP3_SLUGS.map((slug) => demoTop3Spaces.find((s) => s.slug === slug)).filter(
        (s): s is NonNullable<typeof s> => !!s,
      )
    : [];
  const demoPlaylistCards: PlaylistCard[] = orderedDemoTop3.map((s, i) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    district: s.district,
    imageUrl: s.imageUrl,
    tagLabels: visibleTagNames(s.spaceTagLinks ?? []),
    reason: "지금 소개해드리는 공간이에요",
    rank: i + 1,
  }));

  const effectivePlaylistCards = demo ? demoPlaylistCards : playlistCards;
  const effectiveRecommendedCount = demo ? orderedDemoTop3.length : recommended.length;

  // 내 취향과 닮은 사람 — 코사인 유사도 상위 3명 (취향 데이터 부족/미방문 사용자 제외)
  const similar = !ENABLE_SIMILAR_TASTE_PEOPLE_UI || !tasteVector ? [] : similarCandidates
    .filter((u) => u.records.length >= MIN_RECORDS_FOR_SIMILARITY)
    .map((u) => {
      const theirVector = buildWeightedTasteVector(u.records);
      const score = cosineSimilarity(tasteVector, theirVector);
      const tagLabels = aggregateTags(u.records).slice(0, 3).map(([t]) => TAG_LABELS[t]);
      const phrase = getTastePhrase(aggregateTags(u.records).slice(0, 5).map(([t, count]) => ({ name: TAG_LABELS[t], weight: count })));
      const seenSpaces = new Set<string>();
      const spaces = u.records
        .filter((r) => {
          if (seenSpaces.has(r.space.id)) return false;
          seenSpaces.add(r.space.id);
          return true;
        })
        .slice(0, 3)
        .map((r) => r.space);
      return { id: u.id, nickname: u.nickname, phrase, tagLabels, spaces, score };
    })
    .filter((u) => u.score > 0.05 && u.spaces.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const savedTasteCards = user.savedTastes.map((st) => {
    const tTags = aggregateTags(st.target.records).slice(0, 3).map(([t]) => TAG_LABELS[t]);
    const phrase = getTastePhrase(aggregateTags(st.target.records).slice(0, 5).map(([t, count]) => ({ name: TAG_LABELS[t], weight: count })));
    const seenSpaces = new Set<string>();
    const spaces = st.target.records
      .filter((r) => {
        if (seenSpaces.has(r.space.id)) return false;
        seenSpaces.add(r.space.id);
        return true;
      })
      .slice(0, 3)
      .map((r) => r.space);
    return { id: st.target.id, phrase, tagLabels: tTags, spaces };
  });

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
      {header}

      <section className="mb-10 space-y-2">
        <h1 className="text-xl font-bold leading-snug">내 취향과 닮은 공간</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          지금까지 남긴 공간 경험과 취향을 바탕으로<br />나와 잘 맞는 공간을 추천해요
        </p>
        <p className="text-xs pt-1" style={{ color: "var(--border)" }}>{tastePhrase}</p>
      </section>

      {allRecords.length < 3 && !demo ? (
        <section className="mb-10 space-y-2 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 취향을 파악하는 중입니다<br />
            공간 3곳을 기록하면<br />
            당신의 취향과 닮은 공간을 보여드립니다
          </p>
          <p className="text-xs" style={{ color: "var(--border)" }}>{allRecords.length} / 3 기록됨</p>
        </section>
      ) : (
        <>
          <Divider className="my-8" />
          <section className="mb-10">
            <SectionLabel>// 내 취향과 비슷한 공간 TOP 3</SectionLabel>
            {ENABLE_RECOMMENDATION_PLAYLIST_UI && effectivePlaylistCards.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs -mt-3" style={{ color: "var(--dim)" }}>
                  높은 점수를 남긴 공간들의 결을 바탕으로 골랐어요
                </p>
                <RecommendationPlaylist cards={effectivePlaylistCards} />
              </div>
            ) : !ENABLE_RECOMMENDATION_PLAYLIST_UI && recommended.length > 0 ? (
              /* 레거시: 정적 리스트 (플래그 복구용 보존) */
              <div className="space-y-5">
                {recommended.map((rec) => {
                  const reason = getRecommendReason(rec, myTopTagList);
                  return (
                    <Link key={rec.id} href={`/space/${rec.slug}`} className="block group space-y-0.5">
                      <p className="text-sm font-medium group-hover:underline">{rec.name}</p>
                      {rec.district && (
                        <p className="text-xs" style={{ color: "var(--dim)" }}>{rec.district}</p>
                      )}
                      {reason && (
                        <p className="text-xs" style={{ color: "var(--dim)" }}>{reason}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                아직 취향에 꼭 맞는 공간을 찾지 못했어요<br />
                새로운 공간이 열리면 알려드릴게요
              </p>
            )}
            {effectiveRecommendedCount > 0 && (
              <Link href="/archive/taste/all" className="inline-block mt-4 text-xs" style={{ color: "var(--fg)" }}>
                전체 추천 공간 보기 →
              </Link>
            )}
          </section>

          {ENABLE_SIMILAR_TASTE_PEOPLE_UI && (
            <>
              <Divider className="my-8" />
              <section className="mb-10">
                <SectionLabel>// 내 취향과 닮은 사람</SectionLabel>
                <p className="text-xs -mt-3 mb-5" style={{ color: "var(--dim)" }}>
                  비슷한 공간에 머문 사람들의 취향입니다
                </p>
                {similar.length > 0 ? (
                  <div className="space-y-6">
                    {similar.map((card) => (
                      <TasteProfileCard
                        key={card.id}
                        href={`/taste/${card.id}`}
                        nickname={card.nickname}
                        phrase={card.phrase}
                        tagLabels={card.tagLabels}
                        spaces={card.spaces}
                        note={getSimilarityPhrase(card.score)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                    취향 기록이 더 쌓이면<br />비슷한 취향의 사람을 만날 수 있습니다
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {savedTasteCards.length > 0 && (
        <>
          <Divider className="my-8" />
          <section className="mb-10">
            <SectionLabel>관심 있는 취향</SectionLabel>
            <div className="space-y-6">
              {savedTasteCards.map((card) => (
                <TasteProfileCard
                  key={card.id}
                  href={`/taste/${card.id}`}
                  phrase={card.phrase}
                  tagLabels={card.tagLabels}
                  spaces={card.spaces}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <ArchiveBottomNav />
    </main>
  );
}
