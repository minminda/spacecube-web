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
  const locale = lang === "en" ? "en-US" : "ko-KR";
  return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function Divider() {
  return <div className="mb-8 text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</div>;
}

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const lang = await getLang();
  const ko = lang === "ko";
  const TAG_LABELS = getTagLabels(lang);

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
          target: {
            include: {
              records: { include: { tags: true } },
            },
          },
        },
      },
    },
  });
  if (!user) redirect("/login");

  const allRecords = user.records;
  const allTags = aggregateTags(allRecords);
  const topTags = allTags.slice(0, 5);
  const tastePhrase = getTastePhrase(topTags, lang);
  const maxCount = topTags[0]?.[1] ?? 1;
  const myTopTagList = topTags.slice(0, 3).map(([t]) => t);

  const memos = allRecords.filter((r) => r.memo);
  const wantAgain = allRecords.filter((r) => r.tags.some((t) => t.tag === "WANT_AGAIN"));
  const visitedSpaces = allRecords.map((r) => ({ id: r.space.id, name: r.space.name, slug: r.space.slug }));
  const displayName = user.nickname || user.name?.split(" ")[0] || (ko ? "나" : "Me");

  const savedTasteCards = user.savedTastes.map((st) => {
    const tTags = aggregateTags(st.target.records).slice(0, 5);
    return {
      id: st.target.id,
      nickname: st.target.nickname || st.target.name?.split(" ")[0] || (ko ? "익명" : "Anonymous"),
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
                  nickname: u.nickname || u.name?.split(" ")[0] || (ko ? "익명" : "Anonymous"),
                  phrase: getTastePhrase(aggregateTags(u.records).slice(0, 5), lang),
                  score: tagOverlap(myTopTagList, their),
                };
              })
              .filter((u) => u.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
          )
      : [];

  return (
    <main className="flex flex-col min-h-screen px-6 pt-6 pb-16" style={{ color: "var(--fg)" }}>
      {/* 상단 네비 */}
      <nav className="flex justify-between items-center mb-8">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>←</Link>
        <div />
        <SettingsPanel nickname={user.nickname} visibility={user.visibility} userId={user.id} lang={lang} />
      </nav>

      {/* 닉네임 + 취향 한 줄 */}
      <section className="mb-10 space-y-2">
        <p className="text-lg" style={{ color: "var(--fg)" }}>{displayName}</p>
        {allRecords.length > 0
          ? <p className="text-sm" style={{ color: "var(--dim)" }}>{tastePhrase}</p>
          : <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
              {ko
                ? <>아직 기록이 없어.<br />공간 안의 큐브를 스캔해봐.</>
                : <>No records yet.<br />Scan the cube inside a space.</>}
            </p>
        }
      </section>

      {allRecords.length > 0 && (
        <>
          {/* 취향 태그 분포 */}
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

          {/* 방문 공간 목록 */}
          <section className="mb-10 space-y-4">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
              {ko ? "내가 다녀온 곳" : "Places I've Been"}
            </p>
            {allRecords.map((r) => (
              <Link key={r.id} href={`/archive/${r.id}`} className="flex flex-col gap-0.5 group">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>
                    {r.space.name}
                  </span>
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

          {/* 메모 */}
          {memos.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-4">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
                  {ko ? "그때 내가 남긴 말" : "What I Wrote"}
                </p>
                {memos.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--fg)" }}>
                      &ldquo;{r.memo}&rdquo;
                    </p>
                    <p className="text-xs" style={{ color: "var(--dim)" }}>— {r.space.name}</p>
                  </div>
                ))}
              </section>
            </>
          )}

          <Divider />

          {/* 컬렉션 */}
          <section className="mb-10">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
              {ko ? "묶어둔 곳들" : "Grouped Places"}
            </p>
            <CollectionManager collections={user.collections} visitedSpaces={visitedSpaces} lang={lang} />
          </section>

          {/* 다시 가고 싶은 곳 */}
          {wantAgain.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-3">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
                  {ko ? "다시 가고 싶었던 곳" : "Places to Return To"}
                </p>
                {wantAgain.map((r) => (
                  <Link key={r.id} href={`/space/${r.space.slug}`} className="flex items-center gap-2 group">
                    <span style={{ color: "var(--dim)" }}>·</span>
                    <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>
                      {r.space.name}
                    </span>
                  </Link>
                ))}
              </section>
            </>
          )}

          {/* 관심 있는 취향 */}
          {savedTasteCards.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-4">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
                  {ko ? "관심 있는 취향" : "Saved Tastes"}
                </p>
                {savedTasteCards.map((u) => (
                  <Link key={u.id} href={`/u/${u.id}`} className="flex items-start gap-2 group">
                    <span style={{ color: "var(--dim)" }} className="mt-0.5">·</span>
                    <div>
                      <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>
                        {u.nickname}
                      </span>
                      <span className="text-xs" style={{ color: "var(--dim)" }}> · {u.phrase}</span>
                    </div>
                  </Link>
                ))}
              </section>
            </>
          )}

          {/* 비슷한 취향 */}
          {similar.length > 0 && (
            <>
              <Divider />
              <section className="mb-10 space-y-4">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
                  {ko ? "비슷한 취향" : "Similar Tastes"}
                </p>
                {similar.map((u) => (
                  <Link key={u.id} href={`/u/${u.id}`} className="flex items-start gap-2 group">
                    <span style={{ color: "var(--dim)" }} className="mt-0.5">·</span>
                    <div>
                      <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>
                        {u.nickname}
                      </span>
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
