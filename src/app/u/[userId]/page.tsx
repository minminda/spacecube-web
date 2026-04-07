import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTagLabels } from "@/lib/tags";
import { getLang } from "@/lib/i18n";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import SaveTasteButton from "@/components/SaveTasteButton";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PublicArchivePage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();
  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);

  const anon = lang === "ko" ? "익명" : lang === "ja" ? "匿名" : "Anonymous";

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { records: { orderBy: { visitedAt: "desc" }, include: { space: true, tags: true } } },
  });

  if (!target) notFound();
  if (session?.user?.email && session.user.email === target.email) redirect("/archive");
  if (target.visibility === "PRIVATE") notFound();

  const allTags    = aggregateTags(target.records);
  const topTags    = allTags.slice(0, 5);
  const tastePhrase = getTastePhrase(topTags, lang);
  const maxCount   = topTags[0]?.[1] ?? 1;
  const displayName = target.nickname || target.name?.split(" ")[0] || anon;

  const recentSpaces = target.records.slice(0, 5);
  const publicMemos  = target.records.filter((r) => r.memo).slice(0, 3);

  let isLoggedIn = false;
  let alreadySaved = false;
  if (session?.user?.email) {
    isLoggedIn = true;
    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (me) {
      const existing = await prisma.savedTaste.findUnique({
        where: { userId_targetUserId: { userId: me.id, targetUserId: userId } },
      });
      alreadySaved = !!existing;
    }
  }

  const t = {
    tasteProfile:   lang === "ko" ? "취향 구경"      : lang === "ja" ? "好みを見る"      : "Taste Profile",
    records:        lang === "ko" ? `${displayName}의 기록` : lang === "ja" ? `${displayName}の記録` : `${displayName}'s Records`,
    recentSpaces:   lang === "ko" ? "최근 좋아한 공간" : lang === "ja" ? "最近気に入った空間" : "Recently Liked Spaces",
    notes:          lang === "ko" ? "남긴 말"         : lang === "ja" ? "残したメモ"        : "Notes",
  };

  return (
    <main className="flex flex-col min-h-screen px-6 pt-6 pb-16" style={{ color: "var(--fg)" }}>
      <nav className="flex justify-between items-center mb-8">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>←</Link>
        <p className="text-xs" style={{ color: "var(--dim)" }}>{t.tasteProfile}</p>
        <div style={{ width: "1rem" }} />
      </nav>

      <section className="mb-10 space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>{t.records}</p>
        <p className="text-base" style={{ color: "var(--fg)" }}>{tastePhrase}</p>
      </section>

      {topTags.length > 0 && (
        <section className="mb-10 space-y-2">
          {topTags.map(([tag, count]) => {
            const filled = Math.round((count / maxCount) * 10);
            return (
              <div key={tag} className="flex items-center gap-3 text-xs">
                <span className="w-16 flex-shrink-0 text-right" style={{ color: "var(--dim)" }}>{TAG_LABELS[tag]}</span>
                <span style={{ letterSpacing: "2px" }}>
                  <span style={{ color: "var(--fg)" }}>{"▪".repeat(filled)}</span>
                  <span style={{ color: "var(--border)" }}>{"▫".repeat(10 - filled)}</span>
                </span>
              </div>
            );
          })}
        </section>
      )}

      <Divider />

      {recentSpaces.length > 0 && (
        <section className="mb-10 space-y-3">
          <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.recentSpaces}</p>
          {recentSpaces.map((r) => (
            <Link key={r.id} href={`/space/${r.space.slug}`} className="flex justify-between items-baseline group">
              <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>{r.space.name}</span>
              {r.tags.length > 0 && (
                <span className="text-xs flex-shrink-0 ml-4" style={{ color: "var(--dim)" }}>
                  {r.tags.slice(0, 2).map((tag) => TAG_LABELS[tag.tag]).join(" · ")}
                </span>
              )}
            </Link>
          ))}
        </section>
      )}

      {publicMemos.length > 0 && (
        <>
          <Divider />
          <section className="mb-10 space-y-4">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>{t.notes}</p>
            {publicMemos.map((r) => (
              <div key={r.id} className="space-y-1">
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg)" }}>&ldquo;{r.memo}&rdquo;</p>
                <p className="text-xs" style={{ color: "var(--dim)" }}>— {r.space.name}</p>
              </div>
            ))}
          </section>
        </>
      )}

      <Divider />

      <section className="mb-6">
        <SaveTasteButton targetUserId={userId} initialSaved={alreadySaved} isLoggedIn={isLoggedIn} lang={lang} />
      </section>
    </main>
  );
}

function Divider() {
  return <div className="mb-8 text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</div>;
}
