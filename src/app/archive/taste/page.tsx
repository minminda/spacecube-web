import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import TasteProfileCard from "@/components/TasteProfileCard";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import {
  rankSpaces, getRecommendReason,
  buildWeightedTasteVector, vectorTopTags, rankSpacesByVector, getVectorReason,
  cosineSimilarity, getSimilarityPhrase, visibleTagNames,
} from "@/lib/recommend";
import {
  ENABLE_TASTE_SCORE_RECOMMENDATION,
  ENABLE_RECOMMENDATION_PLAYLIST_UI,
} from "@/lib/features";
import RecommendationPlaylist, { type PlaylistCard } from "@/components/RecommendationPlaylist";
import ArchiveBottomNav from "@/components/archive/ArchiveBottomNav";
import Divider from "@/components/Divider";

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

  const allRecords = user.records;

  const header = (
    <nav className="flex justify-between items-center mb-10">
      <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>← 공간 노트</Link>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>내 취향</p>
    </nav>
  );

  if (allRecords.length === 0) {
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
  const maxCount = topTags[0]?.[1] ?? 1;
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

  const [recommendCandidates, similarCandidates] = await Promise.all([
    allRecords.length >= 3 && myTopTagList.length > 0
      ? prisma.space.findMany({
          where: { isActive: true, id: { notIn: [...visitedIds] } },
          select: {
            id: true, name: true, slug: true, tagline: true, imageUrl: true, type: true, district: true,
            spaceTagLinks: { include: { tag: true } },
          },
          take: 30,
        })
      : Promise.resolve([]),
    allRecords.length >= 3
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
  ]);

  const recommended = tasteVector
    ? rankSpacesByVector(recommendCandidates, tasteVector, 3)
    : rankSpaces(recommendCandidates, myTopTagList, 3);

  const playlistCards: PlaylistCard[] = tasteVector
    ? recommended.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        district: s.district,
        imageUrl: s.imageUrl,
        tagLabels: visibleTagNames(s.spaceTagLinks ?? []),
        reason: getVectorReason(s, tasteVector),
      }))
    : [];

  // 내 취향과 닮은 사람 — 코사인 유사도 상위 3명 (취향 데이터 부족/미방문 사용자 제외)
  const similar = !tasteVector ? [] : similarCandidates
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
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{tastePhrase}</p>
      </section>

      {topTagsWithNames.length > 0 && (
        <section className="mb-10 space-y-2.5">
          {topTagsWithNames.map(({ name, weight }) => {
            const filled = Math.round((weight / maxCount) * 10);
            return (
              <div key={name} className="flex items-center gap-4 text-xs">
                <span className="w-16 flex-shrink-0 text-right text-xs" style={{ color: "var(--dim)" }}>{name}</span>
                <div className="flex-1 h-0.5 relative" style={{ background: "var(--border)" }}>
                  <div
                    className="absolute inset-y-0 left-0 h-full"
                    style={{ width: `${filled * 10}%`, background: "var(--fg)", transition: "width 0.6s ease" }}
                  />
                </div>
                <span className="w-4 text-right" style={{ color: "var(--dim)" }}>{weight}</span>
              </div>
            );
          })}
        </section>
      )}

      {allRecords.length < 3 ? (
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
            <SectionLabel>// 내 취향과 닮은 공간</SectionLabel>
            {ENABLE_RECOMMENDATION_PLAYLIST_UI && playlistCards.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs -mt-3" style={{ color: "var(--dim)" }}>
                  높은 점수를 남긴 공간들의 결을 바탕으로 골랐어요
                </p>
                <RecommendationPlaylist cards={playlistCards} />
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
              <p className="text-sm" style={{ color: "var(--dim)" }}>
                아직 추천할 공간이 없습니다
              </p>
            )}
          </section>
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
