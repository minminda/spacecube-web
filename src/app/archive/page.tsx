import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import SettingsPanel from "@/components/SettingsPanel";
import CollectionManager from "@/components/CollectionManager";
import TasteProfileCard from "@/components/TasteProfileCard";
import VisitedSpacesPager, { type VisitedRow } from "@/components/VisitedSpacesPager";
import NotificationBell from "@/components/NotificationBell";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import {
  rankSpaces, getRecommendReason,
  buildWeightedTasteVector, vectorTopTags, rankSpacesByVector, getVectorReason,
  cosineSimilarity, getSimilarityPhrase,
} from "@/lib/recommend";
import {
  ENABLE_TASTE_SCORE_RECOMMENDATION,
  ENABLE_RECOMMENDATION_PLAYLIST_UI,
} from "@/lib/features";
import RecommendationPlaylist, { type PlaylistCard } from "@/components/RecommendationPlaylist";
import { formatDotDate as formatDate } from "@/lib/time";

function Divider({ className }: { className?: string }) {
  return <div className={`my-8 ${className ?? ""}`} style={{ borderTop: "1px solid var(--border)" }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "var(--dim)" }}>
      {children}
    </p>
  );
}

const MIN_RECORDS_FOR_SIMILARITY = 2; // 취향 데이터가 지나치게 부족한 사용자 제외 기준

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: { include: { spaceTagLinks: { include: { tag: true } } } }, tags: true },
      },
      collections: { orderBy: { createdAt: "asc" }, include: { items: { orderBy: { addedAt: "asc" }, include: { space: true } } } },
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
      savedSpaces: {
        orderBy: { createdAt: "desc" },
        include: { space: { select: { id: true, name: true, slug: true, type: true, district: true, imageUrl: true, tagline: true, spaceTags: true } } },
      },
    },
  });
  if (!user) redirect("/login");

  const unreadNotificationCount = await prisma.notification.count({ where: { receiverId: user.id, isRead: false } });

  const allRecords = user.records;

  // 취향 프로파일: tasteScore × 태그 가중치 벡터(신규) 또는 태그 빈도(레거시, 플래그 복구용 보존)
  const tasteVector = ENABLE_TASTE_SCORE_RECOMMENDATION ? buildWeightedTasteVector(allRecords) : null;
  const allTags      = tasteVector ? vectorTopTags(tasteVector) : aggregateTags(allRecords);
  const topTags      = allTags.slice(0, 5);
  const tastePhrase  = getTastePhrase(topTags);
  const maxCount     = topTags[0]?.[1] ?? 1;
  const myTopTagList = topTags.slice(0, 3).map(([t]) => t);

  const visitedIds = new Set(allRecords.map((r) => r.space.id));
  const savedTargetIds = new Set(user.savedTastes.map((st) => st.targetUserId));

  // 취향 발견(닮은 공간) / 내가 남긴 흔적 / 취향 닮은 사람 — 서로 독립적이라 병렬로 조회
  const [recommendCandidates, myGuestbookNotes, similarCandidates] = await Promise.all([
    allRecords.length >= 3 && myTopTagList.length > 0
      ? prisma.space.findMany({
          where: { isActive: true, id: { notIn: [...visitedIds] } },
          select: { id: true, name: true, slug: true, tagline: true, imageUrl: true, type: true, district: true, spaceTags: true },
          take: 30,
        })
      : Promise.resolve([]),
    prisma.guestbookNote.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        space: { select: { name: true, slug: true, spaceTags: true } },
        session: { select: { id: true, status: true } },
      },
    }),
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
                space: { select: { id: true, name: true, slug: true, spaceTags: true, spaceTagLinks: { include: { tag: true } } } },
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
        tagLabels: s.spaceTags.slice(0, 3).map((t) => TAG_LABELS[t]),
        reason: getVectorReason(s, tasteVector),
      }))
    : [];

  // 저장한 공간도 같은 플레이리스트 카드 형태로 재사용
  const savedSpaceCards: PlaylistCard[] = user.savedSpaces.map((s) => ({
    id: s.space.id,
    slug: s.space.slug,
    name: s.space.name,
    district: s.space.district,
    imageUrl: s.space.imageUrl,
    tagLabels: s.space.spaceTags.slice(0, 3).map((t) => TAG_LABELS[t]),
    reason: s.space.tagline ?? [s.space.type, s.space.district].filter(Boolean).join(" · "),
  }));

  // 내 취향과 닮은 사람 — 코사인 유사도 상위 3명 (취향 데이터 부족/미방문 사용자 제외)
  const similar = !tasteVector ? [] : similarCandidates
    .filter((u) => u.records.length >= MIN_RECORDS_FOR_SIMILARITY)
    .map((u) => {
      const theirVector = buildWeightedTasteVector(u.records);
      const score = cosineSimilarity(tasteVector, theirVector);
      const tagLabels = aggregateTags(u.records).slice(0, 3).map(([t]) => TAG_LABELS[t]);
      const phrase = getTastePhrase(aggregateTags(u.records).slice(0, 5));
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

  const wantAgainMap = new Map<string, typeof allRecords[0]>();
  allRecords.filter((r) => r.tags.some((t) => t.tag === "WANT_AGAIN")).forEach((r) => {
    if (!wantAgainMap.has(r.space.id)) wantAgainMap.set(r.space.id, r);
  });
  const wantAgain = [...wantAgainMap.values()];
  const visitedSpaces = allRecords.map((r) => ({ id: r.space.id, name: r.space.name, slug: r.space.slug }));
  const displayName   = user.nickname || user.name?.split(" ")[0] || "나";

  const visitedRows: VisitedRow[] = allRecords.map((r) => ({
    id: r.id,
    name: r.space.name,
    visitedAt: formatDate(r.visitedAt),
    tasteScore: r.tasteScore,
  }));

  const savedTasteCards = user.savedTastes.map((st) => {
    const tTags = aggregateTags(st.target.records).slice(0, 3).map(([t]) => TAG_LABELS[t]);
    const phrase = getTastePhrase(aggregateTags(st.target.records).slice(0, 5));
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
      <nav className="flex justify-between items-center mb-10">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← </Link>
        <div className="flex items-center gap-4">
          <NotificationBell initialUnreadCount={unreadNotificationCount} />
          <SettingsPanel nickname={user.nickname} visibility={user.visibility} userId={user.id} />
        </div>
      </nav>

      <div className="md:grid md:grid-cols-2 md:gap-12 md:items-start">
        {/* 왼쪽 패널: 프로필 + 취향 차트 (1. 내 취향 요약) */}
        <div className="md:sticky md:top-8">
          <section className="mb-10 space-y-2">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {allRecords.length > 0
              ? <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{tastePhrase}</p>
              : <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>아직 기록이 없어.<br />공간 안의 큐브를 스캔해봐.</p>}
          </section>

          {allRecords.length > 0 && topTags.length > 0 && (
            <section className="mb-10 space-y-2.5">
              {topTags.map(([tag, count]) => {
                const filled = Math.round((count / maxCount) * 10);
                return (
                  <div key={tag} className="flex items-center gap-4 text-xs">
                    <span className="w-16 flex-shrink-0 text-right text-xs" style={{ color: "var(--dim)" }}>{TAG_LABELS[tag]}</span>
                    <div className="flex-1 h-0.5 relative" style={{ background: "var(--border)" }}>
                      <div
                        className="absolute inset-y-0 left-0 h-full"
                        style={{ width: `${filled * 10}%`, background: "var(--fg)", transition: "width 0.6s ease" }}
                      />
                    </div>
                    <span className="w-4 text-right" style={{ color: "var(--dim)" }}>{count}</span>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        {/* 오른쪽 패널: 기록 섹션들 */}
        <div>
          {allRecords.length > 0 && (
            <>
              <Divider className="md:hidden" />

              {/* 2. 내 취향과 닮은 공간 */}
              {allRecords.length < 3 ? (
                <>
                  <section className="mb-10 space-y-2 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                      아직 취향을 파악하는 중입니다.<br />
                      공간 3곳을 기록하면<br />
                      당신의 취향과 닮은 공간을 보여드립니다.
                    </p>
                    <p className="text-xs" style={{ color: "var(--border)" }}>
                      {allRecords.length} / 3 기록됨
                    </p>
                  </section>
                  <Divider />
                </>
              ) : (
                <>
                  <section className="mb-10">
                    <SectionLabel>// 내 취향과 닮은 공간</SectionLabel>
                    {ENABLE_RECOMMENDATION_PLAYLIST_UI && playlistCards.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-xs -mt-3" style={{ color: "var(--dim)" }}>
                          높은 점수를 남긴 공간들의 결을 바탕으로 골랐어요.
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
                        아직 추천할 공간이 없습니다.
                      </p>
                    )}
                  </section>
                  <Divider />

                  {/* 3. 내 취향과 닮은 사람 TOP 3 */}
                  <section className="mb-10">
                    <SectionLabel>// 내 취향과 닮은 사람</SectionLabel>
                    <p className="text-xs -mt-3 mb-5" style={{ color: "var(--dim)" }}>
                      비슷한 공간에 머문 사람들의 취향입니다.
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
                        취향 기록이 더 쌓이면<br />비슷한 취향의 사람을 만날 수 있습니다.
                      </p>
                    )}
                  </section>
                  <Divider />
                </>
              )}

              {/* 4. 내가 방문한 공간 — 5개씩 묶어 페이지 넘김 */}
              <section className="mb-10">
                <SectionLabel>내가 방문한 공간</SectionLabel>
                <VisitedSpacesPager records={visitedRows} />
              </section>

              {/* 5. 저장한 공간 — 닮은 공간과 동일한 플레이리스트 UI 재사용 */}
              <Divider />
              <section className="mb-10">
                <SectionLabel>저장한 공간</SectionLabel>
                {savedSpaceCards.length > 0 ? (
                  <RecommendationPlaylist cards={savedSpaceCards} />
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                    아직 저장한 공간이 없습니다.<br />마음에 남는 공간을 저장해보세요.
                  </p>
                )}
              </section>

              {/* 6. 관심 있는 취향 — 저장한 공간 바로 아래 */}
              {savedTasteCards.length > 0 && (
                <>
                  <Divider />
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

              {/* 7. 내가 남긴 흔적 — 방명록 포스트잇 (아카이브에서 유일하게 사용자 문장이 보이는 곳) */}
              {myGuestbookNotes.length > 0 && (
                <>
                  <Divider />
                  <section className="mb-10">
                    <SectionLabel>// 내가 남긴 흔적</SectionLabel>
                    <p className="text-xs -mt-3 mb-5" style={{ color: "var(--dim)" }}>
                      공간마다 남겨진 작은 흔적이 모였습니다.
                    </p>
                    <div
                      className="flex gap-3 overflow-x-auto snap-x pb-3 -mx-6 px-6"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {myGuestbookNotes.map((note, i) => {
                        // 진행 중인(ACTIVE) 세션 흔적은 캔버스 ?focus= 점프, 종료된(ARCHIVED) 세션
                        // 흔적은 캔버스로 재현하지 않으므로 아카이브 상세 카드의 ?highlight=로 대체한다.
                        const href = note.session.status === "ACTIVE"
                          ? `/space/${note.space.slug}/guestbook?focus=${note.id}`
                          : `/space/${note.space.slug}/guestbook/archive/${note.session.id}?highlight=${note.id}`;
                        return (
                        <Link
                          key={note.id}
                          href={href}
                          className="flex-shrink-0 w-40 snap-start p-3.5 relative"
                          style={{
                            background: note.color,
                            transform: `rotate(${i % 2 === 0 ? -1.4 : 1.2}deg)`,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                          }}
                        >
                          <span
                            aria-hidden
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5"
                            style={{ background: "#00000018" }}
                          />
                          <p
                            className="text-[13px] leading-relaxed break-keep line-clamp-4"
                            style={{ color: "#3d3524" }}
                          >
                            {note.content}
                          </p>
                          <div className="mt-3 space-y-0.5">
                            <p className="text-[11px] font-medium" style={{ color: "#3d3524" }}>
                              {note.space.name}
                            </p>
                            <p className="text-[10px]" style={{ color: "#8a7d5c" }}>
                              {formatDate(note.createdAt)}
                              {note.space.spaceTags.length > 0 &&
                                ` · ${note.space.spaceTags.slice(0, 2).map((t) => TAG_LABELS[t]).join(" · ")}`}
                            </p>
                          </div>
                        </Link>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}

              {/* 기존 기능 보존 — 이번 작업 대상 밖, 위치만 맨 뒤로 */}
              <Divider />
              <section className="mb-10">
                <SectionLabel>묶어둔 곳들</SectionLabel>
                <CollectionManager collections={user.collections} visitedSpaces={visitedSpaces} />
              </section>

              {wantAgain.length > 0 && (
                <>
                  <Divider />
                  <section className="mb-10">
                    <SectionLabel>다시 가고 싶었던 곳</SectionLabel>
                    <div className="space-y-3">
                      {wantAgain.map((r) => (
                        <Link key={r.id} href={`/space/${r.space.slug}`} className="flex items-center gap-3 group">
                          <span style={{ color: "var(--border)" }}>·</span>
                          <span className="text-sm font-medium group-hover:underline">{r.space.name}</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
