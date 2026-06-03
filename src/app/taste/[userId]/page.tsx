import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import SaveTasteButton from "@/components/SaveTasteButton";

interface Props { params: Promise<{ userId: string }> }

export default async function TasteJourneyPage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: { select: { id: true, name: true, slug: true, type: true, district: true } }, tags: true },
      },
    },
  });

  if (!target || target.visibility === "PRIVATE") notFound();

  if (session?.user?.email === target.email) {
    const { redirect } = await import("next/navigation");
    redirect("/archive");
  }

  const topTags = aggregateTags(target.records).slice(0, 5);
  const tastePhrase = getTastePhrase(topTags);

  const seenSpaces = new Set<string>();
  const uniqueRecords = target.records.filter((r) => {
    if (seenSpaces.has(r.space.id)) return false;
    seenSpaces.add(r.space.id);
    return true;
  });

  let isLoggedIn = false;
  let alreadySaved = false;
  let isSelf = false;
  if (session?.user?.email) {
    isLoggedIn = true;
    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (me) {
      isSelf = me.id === userId;
      if (!isSelf) {
        const existing = await prisma.savedTaste.findUnique({
          where: { userId_targetUserId: { userId: me.id, targetUserId: userId } },
        });
        alreadySaved = !!existing;
      }
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 pt-10 pb-16 gap-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
      </div>

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>취향 흐름</p>
        <h1 className="text-xl font-bold leading-snug">{tastePhrase}</h1>
      </section>

      {topTags.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>자주 선택한 감정</p>
          <div className="flex flex-wrap gap-2">
            {topTags.slice(0, 4).map(([tag]) => (
              <span key={tag} className="text-xs px-2 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        </section>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>이 취향이 다녀온 공간</p>

        {uniqueRecords.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 공개된 기록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {uniqueRecords.map((r, i) => (
              <Link key={r.id} href={`/space/${r.space.slug}`} className="flex gap-4 group">
                <span className="text-xs flex-shrink-0 mt-0.5 w-5 text-right" style={{ color: "var(--border)" }}>
                  {i + 1}
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug group-hover:underline">{r.space.name}</p>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    {[r.space.type, r.space.district].filter(Boolean).join(" · ")}
                  </p>
                  {r.memo && (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>&ldquo;{r.memo}&rdquo;</p>
                  )}
                  {r.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-0.5">
                      {r.tags.slice(0, 2).map((t) => (
                        <span key={t.id} className="text-xs" style={{ color: "var(--border)" }}>
                          {TAG_LABELS[t.tag]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {!isSelf && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-2">
            <p className="text-xs" style={{ color: "var(--dim)" }}>사람을 팔로우하지 않고, 취향을 저장합니다.</p>
            <SaveTasteButton targetUserId={userId} initialSaved={alreadySaved} isLoggedIn={isLoggedIn} />
          </section>
        </>
      )}
    </main>
  );
}
