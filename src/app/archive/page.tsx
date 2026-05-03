import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTagLabels } from "@/lib/tags";
import { getLang } from "@/lib/i18n";
import SettingsPanel from "@/components/SettingsPanel";
import CollectionManager from "@/components/CollectionManager";
import { aggregateTags, getTastePhrase, tagOverlap } from "@/lib/taste";

function formatDate(d: Date, lang: string) {
  const locale = lang === "en" ? "en-US" : lang === "ja" ? "ja-JP" : lang === "zh" ? "zh-CN" : "ko-KR";
  return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}

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

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);
  const anon = lang === "ko" ? "익명" : lang === "ja" ? "匿名" : lang === "zh" ? "匿名" : "Anonymous";
  const me   = lang === "ko" ? "나"   : lang === "ja" ? "私"   : lang === "zh" ? "我"   : "Me";

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      records: { orderBy: { visitedAt: "desc" }, include: { space: true, tags: true } },
      collections: { orderBy: { createdAt: "asc" }, include: { items: { orderBy: { addedAt: "asc" }, include: { space: true } } } },
      savedTastes: {
        orderBy: { savedAt: "desc" },
        include: {
          target: {
            include: {
              records: {
                orderBy: { visitedAt: "desc" },
                include: {
                  space: { select: { id: true, name: true, slug: true } },
                  tags: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) redirect("/login");

  const allRecords   = user.records;
  const allTags      = aggregateTags(allRecords);
  const topTags      = allTags.slice(0, 5);
  const tastePhrase  = getTastePhrase(topTags, lang);
  const maxCount     = topTags[0]?.[1] ?? 1;
  const myTopTagList = topTags.slice(0, 3).map(([t]) => t);

  const memos = allRecords.filter((r) => r.memo);
  const wantAgainMap = new Map<string, typeof allRecords[0]>();
  allRecords.filter((r) => r.tags.some((t) => t.tag === "WANT_AGAIN")).forEach((r) => {
    if (!wantAgainMap.has(r.space.id)) wantAgainMap.set(r.space.id, r);
  });
  const wantAgain = [...wantAgainMap.values()];
  const visitedSpaces = allRecords.map((r) => ({ id: r.space.id, name: r.space.name, slug: r.space.slug }));
  const displayName   = user.nickname || user.name?.split(" ")[0] || me;

  // 저장된 취향 카드: 공간 목록 포함
  const savedTasteCards = user.savedTastes.map((st) => {
    const tTags = aggregateTags(st.target.records).slice(0, 5);
    const phrase = getTastePhrase(tTags, lang);
    const seenSpaces = new Set<string>();
    const spaces = st.target.records
      .filter((r) => {
        if (seenSpaces.has(r.space.id)) return false;
        seenSpaces.add(r.space.id);
        return true;
      })
      .slice(0, 3)
      .map((r) => r.space);
    return { id: st.target.id, phrase, spaces };
  });

  const savedTargetIds = new Set(user.savedTastes.map((st) => st.targetUserId));
  const similar = myTopTagList.length > 0
    ? await prisma.user.findMany({
        where: { visibility: "PARTIAL", id: { not: user.id, notIn: [...savedTargetIds] }, records: { some: {} } },
        include: {
          records: {
            orderBy: { visitedAt: "desc" },
            include: {
              space: { select: { id: true, name: true, slug: true } },
              tags: true,
            },
          },
        },
        take: 50,
      }).then((users) =>
        users.map((u) => {
          const their = aggregateTags(u.records).slice(0, 3).map(([t]) => t);
          const phrase = getTastePhrase(aggregateTags(u.records).slice(0, 5), lang);
          const seenSpaces = new Set<string>();
          const spaces = u.records
            .filter((r) => {
              if (seenSpaces.has(r.space.id)) return false;
              seenSpaces.add(r.space.id);
              return true;
            })
            .slice(0, 3)
            .map((r) => r.space);
          return { id: u.id, phrase, spaces, score: tagOverlap(myTopTagList, their) };
        }).filter((u) => u.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
      )
    : [];

  const t = {
    noRecord:      lang === "ko" ? <>아직 기록이 없어.<br />공간 안의 큐브를 스캔해봐.</> : lang === "ja" ? <>まだ記録がありません。<br />空間内のキューブをスキャンしてみよう。</> : lang === "zh" ? <>还没有记录。<br />试着扫描空间内的方块吧。</> : <>No records yet.<br />Scan the cube inside a space.</>,
    placesBeen:    lang === "ko" ? "내가 다녀온 곳"    : lang === "ja" ? "訪れた場所"        : lang === "zh" ? "我去过的地方"    : "Places I've Been",
    whatIWrote:    lang === "ko" ? "그때 내가 남긴 말"  : lang === "ja" ? "残したメモ"        : lang === "zh" ? "当时留下的话"    : "What I Wrote",
    grouped:       lang === "ko" ? "묶어둔 곳들"        : lang === "ja" ? "グループ化した場所" : lang === "zh" ? "收藏的地方"      : "Grouped Places",
    wantReturn:    lang === "ko" ? "다시 가고 싶었던 곳" : lang === "ja" ? "また行きたい場所"   : lang === "zh" ? "想再去的地方"    : "Places to Return To",
    savedTastes:   lang === "ko" ? "관심 있는 취향"     : lang === "ja" ? "保存した好み"       : lang === "zh" ? "收藏的品味"      : "Saved Tastes",
    similarTastes: lang === "ko" ? "비슷한 취향"        : lang === "ja" ? "似た好みの人"       : lang === "zh" ? "相似品味的人"    : "Similar Tastes",
    followTaste:   lang === "ko" ? "이 취향 따라가기 →" : lang === "ja" ? "この好みをたどる →" : lang === "zh" ? "追随这个品味 →"  : "Follow this taste →",
    spacesVisited: lang === "ko" ? "다녀온 공간"        : lang === "ja" ? "訪れた空間"         : lang === "zh" ? "去过的空间"      : "Spaces visited",
  };

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
      <nav className="flex justify-between items-center mb-10">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← </Link>
        <SettingsPanel nickname={user.nickname} visibility={user.visibility} userId={user.id} lang={lang} />
      </nav>

      {/* 데스크탑: 왼쪽 취향 프로필 + 오른쪽 기록 목록 */}
      <div className="md:grid md:grid-cols-2 md:gap-12 md:items-start">
      {/* 왼쪽 패널: 프로필 + 취향 차트 */}
      <div className="md:sticky md:top-8">
      <section className="mb-10 space-y-2">
        <h1 className="text-2xl font-bold">{displayName}</h1>
        {allRecords.length > 0
          ? <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{tastePhrase}</p>
          : <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{t.noRecord}</p>}
      </section>

      {allRecords.length > 0 && (
        <>
          {topTags.length > 0 && (
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
        </>
      )}
      </div>{/* 왼쪽 패널 끝 */}

      {/* 오른쪽 패널: 기록 섹션들 */}
      <div>
      {allRecords.length > 0 && (
        <>
          <Divider className="md:hidden" />

          <section className="mb-10">
            <SectionLabel>{t.placesBeen}</SectionLabel>
            <div className="space-y-4">
              {allRecords.map((r) => (
                <Link key={r.id} href={`/archive/${r.id}`} className="flex flex-col gap-0.5 group">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium group-hover:underline">{r.space.name}</span>
                    <span className="text-xs flex-shrink-0 ml-4" style={{ color: "var(--dim)" }}>{formatDate(r.visitedAt, lang)}</span>
                  </div>
                  {r.tags.length > 0 && (
                    <span className="text-xs" style={{ color: "var(--dim)" }}>
                      {r.tags.slice(0, 2).map((t) => TAG_LABELS[t.tag]).join(" · ")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {memos.length > 0 && (
            <>
              <Divider />
              <section className="mb-10">
                <SectionLabel>{t.whatIWrote}</SectionLabel>
                <div className="space-y-5">
                  {memos.map((r) => (
                    <div key={r.id} className="space-y-1">
                      <p className="text-sm leading-relaxed">&ldquo;{r.memo}&rdquo;</p>
                      <p className="text-xs" style={{ color: "var(--dim)" }}>— {r.space.name}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <Divider />

          <section className="mb-10">
            <SectionLabel>{t.grouped}</SectionLabel>
            <CollectionManager collections={user.collections} visitedSpaces={visitedSpaces} lang={lang} />
          </section>

          {wantAgain.length > 0 && (
            <>
              <Divider />
              <section className="mb-10">
                <SectionLabel>{t.wantReturn}</SectionLabel>
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

          {savedTasteCards.length > 0 && (
            <>
              <Divider />
              <section className="mb-10">
                <SectionLabel>{t.savedTastes}</SectionLabel>
                <div className="space-y-6">
                  {savedTasteCards.map((card) => (
                    <div key={card.id} className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
                      {/* 취향 문장 */}
                      <p className="text-sm font-medium leading-snug">{card.phrase}</p>

                      {/* 이 취향이 다녀온 공간 */}
                      {card.spaces.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs" style={{ color: "var(--border)" }}>{t.spacesVisited}</p>
                          {card.spaces.map((s) => (
                            <Link
                              key={s.id}
                              href={`/space/${s.slug}`}
                              className="block text-sm hover:underline"
                              style={{ color: "var(--dim)" }}
                            >
                              · {s.name}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* 이 취향 따라가기 */}
                      <Link
                        href={`/taste/${card.id}`}
                        className="inline-block text-xs py-1 px-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                      >
                        {t.followTaste}
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {similar.length > 0 && (
            <>
              <Divider />
              <section className="mb-10">
                <SectionLabel>{t.similarTastes}</SectionLabel>
                <div className="space-y-6">
                  {similar.map((card) => (
                    <div key={card.id} className="space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
                      {/* 취향 문장 */}
                      <p className="text-sm font-medium leading-snug">{card.phrase}</p>

                      {/* 이 취향이 다녀온 공간 */}
                      {card.spaces.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs" style={{ color: "var(--border)" }}>{t.spacesVisited}</p>
                          {card.spaces.map((s) => (
                            <Link
                              key={s.id}
                              href={`/space/${s.slug}`}
                              className="block text-sm hover:underline"
                              style={{ color: "var(--dim)" }}
                            >
                              · {s.name}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* 이 취향 따라가기 */}
                      <Link
                        href={`/taste/${card.id}`}
                        className="inline-block text-xs py-1 px-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                      >
                        {t.followTaste}
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}
      </div>{/* 오른쪽 패널 끝 */}
      </div>{/* md:grid 끝 */}
    </main>
  );
}
