import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { aggregateTags, getTastePhrase } from "@/lib/taste";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PublicArchivePage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: true, tags: true },
      },
    },
  });

  if (!target) notFound();

  // 본인이면 /archive로
  if (session?.user?.email && session.user.email === target.email) {
    const { redirect } = await import("next/navigation");
    redirect("/archive");
  }

  // PRIVATE면 404
  if (target.visibility === "PRIVATE") notFound();

  const allTags = aggregateTags(target.records);
  const topTags = allTags.slice(0, 5);
  const tastePhrase = getTastePhrase(topTags);
  const maxCount = topTags[0]?.[1] ?? 1;
  const displayName = target.nickname || target.name?.split(" ")[0] || "익명";

  // 공개 허용 범위: 최근 5개 방문 + 메모 3개
  const recentSpaces = target.records.slice(0, 5);
  const publicMemos = target.records.filter((r) => r.memo).slice(0, 3);

  return (
    <main className="flex flex-col min-h-screen px-6 pt-6 pb-16 gap-0">
      {/* 네비 */}
      <nav className="flex justify-between items-center mb-8">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>
          ←
        </Link>
        <p className="text-xs" style={{ color: "var(--dim)" }}>취향 구경</p>
        <div style={{ width: "1rem" }} />
      </nav>

      {/* 취향 소개 */}
      <section className="mb-10 space-y-2">
        <p className="text-base" style={{ color: "var(--fg)" }}>
          {displayName}
        </p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          {tastePhrase}
        </p>
      </section>

      {/* 태그 분포 */}
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

      <div className="mb-8 text-xs" style={{ color: "var(--border)" }}>
        ─────────────────────────────
      </div>

      {/* 최근 방문 */}
      {recentSpaces.length > 0 && (
        <section className="mb-10 space-y-3">
          <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
            최근 좋아한 공간
          </p>
          {recentSpaces.map((r) => (
            <Link
              key={r.id}
              href={`/space/${r.space.slug}`}
              className="flex justify-between items-baseline group"
            >
              <span className="text-sm group-hover:underline" style={{ color: "var(--fg)" }}>
                {r.space.name}
              </span>
              <span className="text-xs flex-shrink-0 ml-4" style={{ color: "var(--dim)" }}>
                {r.tags.slice(0, 2).map((t) => TAG_LABELS[t.tag]).join(" · ")}
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* 공개 문장 */}
      {publicMemos.length > 0 && (
        <>
          <div className="mb-8 text-xs" style={{ color: "var(--border)" }}>
            ─────────────────────────────
          </div>
          <section className="mb-10 space-y-4">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
              남긴 말
            </p>
            {publicMemos.map((r) => (
              <div key={r.id} className="space-y-1">
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg)" }}>
                  &ldquo;{r.memo}&rdquo;
                </p>
                <p className="text-xs" style={{ color: "var(--dim)" }}>
                  — {r.space.name}
                </p>
              </div>
            ))}
          </section>
        </>
      )}

      <div className="mb-8 text-xs" style={{ color: "var(--border)" }}>
        ─────────────────────────────
      </div>

      <p className="text-xs" style={{ color: "var(--dim)" }}>
        이 취향과 비슷한 공간 →{" "}
        <Link href="/discover" className="underline">
          둘러보기
        </Link>
      </p>
    </main>
  );
}
