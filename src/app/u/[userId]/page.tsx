import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTagLabels } from "@/lib/tags";
import { getLang } from "@/lib/i18n";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import SaveTasteButton from "@/components/SaveTasteButton";

interface Props { params: Promise<{ userId: string }> }

export default async function PublicTastePage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();
  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: {
          space: { select: { id: true, name: true, slug: true, type: true, district: true } },
          tags: true,
        },
      },
    },
  });

  if (!target) notFound();
  if (session?.user?.email && session.user.email === target.email) redirect("/archive");
  if (target.visibility === "PRIVATE") notFound();

  const topTags     = aggregateTags(target.records).slice(0, 5);
  const tastePhrase = getTastePhrase(topTags, lang);
  const maxCount    = topTags[0]?.[1] ?? 1;

  // 공간 목록 (중복 제거)
  const seenSpaces = new Set<string>();
  const uniqueSpaces = target.records
    .filter((r) => { if (seenSpaces.has(r.space.id)) return false; seenSpaces.add(r.space.id); return true; })
    .slice(0, 8);

  // 메모 있는 기록
  const publicMemos = target.records.filter((r) => r.memo).slice(0, 3);

  let isLoggedIn = false, alreadySaved = false;
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
    spacesLabel: lang === "ko" ? "이 취향이 좋아한 공간" : lang === "ja" ? "この好みが気に入った空間" : lang === "zh" ? "这个品味喜欢的空间" : "Spaces this taste loves",
    notesLabel:  lang === "ko" ? "남긴 말" : lang === "ja" ? "残したメモ" : lang === "zh" ? "留下的话" : "Notes",
    followLabel: lang === "ko" ? "이 취향 따라가기 →" : lang === "ja" ? "この好みをたどる →" : lang === "zh" ? "追随这个品味 →" : "Follow this taste →",
    saveHint:    lang === "ko" ? "사람을 팔로우하지 않고, 취향을 저장합니다." : lang === "ja" ? "人をフォローせず、好みを保存します。" : lang === "zh" ? "不追踪人，保存品味。" : "Save the taste, not the person.",
    tagLabel:    lang === "ko" ? "자주 선택한 감정" : lang === "ja" ? "よく選んだ感情" : lang === "zh" ? "常选情感" : "Feelings often chosen",
  };

  return (
    <main className="flex flex-col min-h-screen px-6 pt-6 pb-16 gap-8">
      {/* 헤더 — 사람 이름 없이 취향 문장만 */}
      <nav className="flex justify-between items-center">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>←</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <div style={{ width: "1rem" }} />
      </nav>

      {/* 취향 문장 + "이 취향 따라가기" CTA */}
      <section className="space-y-4">
        <h1 className="text-lg font-bold leading-snug">{tastePhrase}</h1>
        <Link
          href={`/taste/${userId}`}
          className="inline-block text-xs py-1.5 px-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          style={{ borderColor: "var(--fg)" }}
        >
          {t.followLabel}
        </Link>
      </section>

      {/* 태그 차트 */}
      {topTags.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>{t.tagLabel}</p>
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

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 공간 목록 — 사람보다 공간이 더 크게 */}
      {uniqueSpaces.length > 0 && (
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.spacesLabel}</p>
          <div className="space-y-3">
            {uniqueSpaces.map((r) => (
              <Link key={r.id} href={`/space/${r.space.slug}`} className="flex justify-between items-baseline group">
                <span className="text-sm font-medium group-hover:underline">{r.space.name}</span>
                {r.tags.length > 0 && (
                  <span className="text-xs flex-shrink-0 ml-4" style={{ color: "var(--dim)" }}>
                    {r.tags.slice(0, 2).map((t) => TAG_LABELS[t.tag]).join(" · ")}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 메모 */}
      {publicMemos.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.notesLabel}</p>
            {publicMemos.map((r) => (
              <div key={r.id} className="space-y-1">
                <p className="text-sm leading-relaxed">&ldquo;{r.memo}&rdquo;</p>
                <p className="text-xs" style={{ color: "var(--dim)" }}>— {r.space.name}</p>
              </div>
            ))}
          </section>
        </>
      )}

      {/* 저장 버튼 */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <section className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>{t.saveHint}</p>
        <SaveTasteButton targetUserId={userId} initialSaved={alreadySaved} isLoggedIn={isLoggedIn} lang={lang} />
      </section>
    </main>
  );
}
