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
  const locale = lang === "en" ? "en-US" : lang === "ja" ? "ja-JP" : "ko-KR";
  return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function Divider() {
  return <div className="mb-8 text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</div>;
}

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);

  const anon = lang === "ko" ? "익명" : lang === "ja" ? "匿名" : "Anonymous";
  const me   = lang === "ko" ? "나"   : lang === "ja" ? "私"   : "Me";

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: true, tags: true },
      },
      collections: {
        orderBy: { createdAt: "asc" },
        include: { items: { orderBy: { addedAt: "asc" }, include: { space: true } } },
      },
      savedTastes: {
        orderBy: { savedAt: "desc" },
        include: {
          target: { include: { records: { include: { tags: true } } } },
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

  const memos     = allRecords.filter((r) => r.memo);
  const wantAgain = allRecords.filter((r) => r.tags.some((t) => t.tag === "WANT_AGAIN"));
  const visitedSpaces = allRecords.map((r) => ({ id: r.space.id, name: r.space.name, slug: r.space.slug }));
  const displayName   = user.nickname || user.name?.split(" ")[0] || me;

  const savedTasteCards = user.savedTastes.map((st) => {
    const tTags = aggregateTags(st.target.records).slice(0, 5);
    return {
      id: st.target.id,
      nickname: st.target.nickname || st.target.name?.split(" ")[0] || anon,
      phrase: getTastePhrase(tTags, lang),
    };
  });

  const savedTargetIds = new Set(user.savedTastes.map((st) => st.targetUserId));
  const similar =
    myTopTagList.length > 0
      ? await prisma.user
          .findMany({
            where: {
              visibility: "PARTIAL",
              id: { not: user.id, notIn: [...savedTargetIds] },
              records: { some: {} },
            },
            include: { records: { include: { tags: true } } },
            take: 50,
          })
          .then((users) =>
            users
              .map((u) => {
                const their = aggregateTags(u.records).slice(0, 3).map(([t]) => t);
                return {
                  id: u.id,
                  nickname: u.nickname || u.name?.split(" ")[0] || anon,
                  phrase: getTastePhrase(aggregateTags(u.records).slice(0, 5), lang),
                  score: tagOverlap(myTopTagList, their),
                };
              })
              .filter((u) => u.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
          )
      : [];

  const t = {
    noRecord:     lang === "ko" ? <>아직 기록이 없어.<br />공간 안의 큐브를 스캔해봐.</> : lang === "ja" ? <>まだ記録がありません。<br />空間内のキューブをスキャンしてみよう。</> : <>No records yet.<br />Scan the cube inside a space.</>,
    placesBeen:   lang === "ko" ? "내가 다녀온 곳"    : lang === "ja" ? "訪れた場所"        : "Places I've Been",
    whatIWrote:   lang === "ko" ? "그때 내가 남긴 말"  : lang === "ja" ? "残したメモ"        : "What I Wrote",
    grouped:      lang === "ko" ? "묶어둔 곳들"        : lang === "ja" ? "グループ化した場所" : "Grouped Places",
    wantReturn:   lang === "ko" ? "다시 가고 싶었던 곳" : lang === "ja" ? "また行きたい場所"   : "Places to Return To",
    savedTastes:  lang === "ko" ? "관심 있는 취향"     : lang === "ja" ? "保存した好み"       : "Saved Tastes",
    similarTastes:lang === "ko" ? "비슷한 취향"        : lang === "ja" ? "似た好みの人"       : "Similar Tastes",
  };

  return (
    <main className="flex flex-col min-h-screen px-6 pt-6 pb-16" style={{ color: "var(--fg)" }}>
      <nav className="flex justify-between items-center mb-8">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>←</Link>
        <div />
        <SettingsPanel nickname={user.nickname} visibility={user.visibility} userId={user.id} lang={lang} />
      </nav>

      <section className="mb-10 space-y-2">
        <p className="text-lg" style={{ color: "var(--fg)" }}>{displayName}</p>
        {allRecords.length > 0
          ? <p className="text-sm" style={{ color: "var(--dim)" }}>{tastePhrase}</p>
          : <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{t.noRecord}</p>
        }
      </section>

      {allRecords.length > 0 && (
        <>
          {topTags.length > 0 && (
            <section className="mb-10 space-y-2">
              {topTags.map(([tag, count]) => {
                const filled = Math.round((count / maxCount) * 10);
                return (
                  <div key={tag} className="flex items-center gap-3 text-xs">
                    <span className="w-16 flex-shrink-0 text-right" style={{ color: "var(--dim)" }}>
                      {TAG_LABELS[tag]}
                    </span>
                    <span style={{ letterSpacing: "2px" }}>
                      <span style={{ color: "var(--fg)" }}>{"▪".repeat(filled)}</span>
                      <span style={{ color: "var(--border)" }}>{"▫".repeat(10 - filled)}</span>
                    </span>
                    <span style={{ color: "var(--dim)" }}>{count}</span>
                  </div>
                );
              })}
            </section>
          )}

          <Divider />

          <section className="mb-10 space-y-4">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.placesBeen}</p>
            {allRecords.map((r) => (
              <Link key={r.id} href={`/archive/${r.id}`} className="flex flex-col gap-0.5 group">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>{r.space.name}</span>
                  <span className="text-xs flex-shrink-0 ml-4" style={{ color: "var(--dim)" }}>
                    {formatDate(r.visitedAt, lang)}
                  </span>
                </div>
                {r.tags.length > 0 && (
                  <span className="text-xs" style={{ color: "var(--dim)" }}>
                    {r.tags.slice(0, 2).map((t) => TAG_LABELS[t.tag]).join(" · ")}
                  </span>
                )}
              </Link>
            ))}
          </section>

          {memos.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-4">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.whatIWrote}</p>
                {memos.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--fg)" }}>&ldquo;{r.memo}&rdquo;</p>
                    <p className="text-xs" style={{ color: "var(--dim)" }}>— {r.space.name}</p>
                  </div>
                ))}
              </section>
            </>
          )}

          <Divider />

          <section className="mb-10">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.grouped}</p>
            <CollectionManager collections={user.collections} visitedSpaces={visitedSpaces} lang={lang} />
          </section>

          {wantAgain.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-3">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.wantReturn}</p>
                {wantAgain.map((r) => (
                  <Link key={r.id} href={`/space/${r.space.slug}`} className="flex items-center gap-2 group">
                    <span style={{ color: "var(--dim)" }}>·</span>
                    <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>{r.space.name}</span>
                  </Link>
                ))}
              </section>
            </>
          )}

          {savedTasteCards.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-4">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.savedTastes}</p>
                {savedTasteCards.map((u) => (
                  <Link key={u.id} href={`/u/${u.id}`} className="flex items-start gap-2 group">
                    <span style={{ color: "var(--dim)" }} className="mt-0.5">·</span>
                    <div>
                      <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>{u.nickname}</span>
                      <span className="text-xs" style={{ color: "var(--dim)" }}> · {u.phrase}</span>
                    </div>
                  </Link>
                ))}
              </section>
            </>
          )}

          {similar.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-4">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.similarTastes}</p>
                {similar.map((u) => (
                  <Link key={u.id} href={`/u/${u.id}`} className="flex items-start gap-2 group">
                    <span style={{ color: "var(--dim)" }} className="mt-0.5">·</span>
                    <div>
                      <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>{u.nickname}</span>
                      <span className="text-xs" style={{ color: "var(--dim)" }}> · {u.phrase}</span>
                    </div>
                  </Link>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
