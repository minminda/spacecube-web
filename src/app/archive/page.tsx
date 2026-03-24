import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { Tag } from "@prisma/client";
import SettingsPanel from "@/components/SettingsPanel";
import CollectionManager from "@/components/CollectionManager";

function getTastePhrase(topTags: [Tag, number][]): string {
  if (topTags.length === 0) return "나만의 공간을 탐험하는 사람";
  const tags = topTags.map(([tag]) => tag);

  if (tags.includes("QUIET") && tags.includes("FOCUSED"))     return "조용히 집중할 수 있는 공간을 좋아하는 사람";
  if (tags.includes("QUIET") && tags.includes("INSPIRING"))   return "조용히 영감을 얻는 공간을 찾는 사람";
  if (tags.includes("QUIET") && tags.includes("COMFORTABLE")) return "조용하고 편안한 공간에서 오래 머무는 사람";
  if (tags.includes("WARM") && tags.includes("COMFORTABLE"))  return "따뜻하고 편안한 분위기를 즐기는 사람";
  if (tags.includes("UNIQUE") && tags.includes("INSPIRING"))  return "독특하고 영감 있는 공간을 탐험하는 사람";
  if (tags.includes("SENSIBLE") && tags.includes("UNIQUE"))   return "감각적이고 독특한 공간을 발견하는 사람";
  if (tags.includes("INSPIRING") && tags.includes("SENSIBLE")) return "영감 있고 감각적인 공간에 끌리는 사람";
  if (tags.includes("COMFORTABLE") && tags.includes("WANT_AGAIN")) return "편안해서 다시 찾고 싶은 공간을 좋아하는 사람";

  const fallback: Partial<Record<Tag, string>> = {
    QUIET:       "조용한 공간에서 오래 머무는 사람",
    INSPIRING:   "영감을 주는 공간을 찾는 사람",
    COMFORTABLE: "편안한 공간을 즐기는 사람",
    UNIQUE:      "독특한 공간을 탐험하는 사람",
    WANT_AGAIN:  "다시 찾고 싶은 공간을 만드는 사람",
    SENSIBLE:    "감각 있는 공간에 끌리는 사람",
    WARM:        "따뜻한 분위기의 공간을 좋아하는 사람",
    FOCUSED:     "집중할 수 있는 공간을 선호하는 사람",
  };
  return fallback[tags[0]] ?? "나만의 공간을 탐험하는 사람";
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: true, tags: true },
      },
      collections: {
        orderBy: { createdAt: "asc" },
        include: {
          items: {
            orderBy: { addedAt: "asc" },
            include: { space: true },
          },
        },
      },
    },
  });
  if (!user) redirect("/login");

  const allRecords = user.records;
  const nickname = user.nickname;

  // 태그 집계
  const tagCount: Partial<Record<Tag, number>> = {};
  for (const record of allRecords) {
    for (const rt of record.tags) {
      tagCount[rt.tag] = (tagCount[rt.tag] ?? 0) + 1;
    }
  }
  const topTags = (Object.entries(tagCount) as [Tag, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const tastePhrase = getTastePhrase(topTags);
  const maxCount = topTags[0]?.[1] ?? 1;

  // 감정 문장 (메모 있는 것만)
  const memos = allRecords.filter((r) => r.memo);

  // 다시 가고 싶은 곳 (WANT_AGAIN 태그)
  const wantAgain = allRecords.filter((r) =>
    r.tags.some((t) => t.tag === "WANT_AGAIN")
  );

  // 컬렉션에 추가 가능한 공간 목록
  const visitedSpaces = allRecords.map((r) => ({
    id: r.space.id,
    name: r.space.name,
    slug: r.space.slug,
  }));

  const displayName = nickname || (user.name?.split(" ")[0]) || "나";

  return (
    <main
      className="flex flex-col min-h-screen px-6 pt-6 pb-16 gap-0"
      style={{ color: "var(--fg)" }}
    >
      {/* ── 상단 네비 ── */}
      <nav className="flex justify-between items-center mb-8">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>
          ←
        </Link>
        <p className="text-xs" style={{ color: "var(--dim)" }}>아카이브</p>
        <SettingsPanel nickname={nickname} />
      </nav>

      {allRecords.length === 0 ? (
        /* ── 기록 없음 ── */
        <div className="flex-1 flex flex-col justify-center gap-3 mt-20">
          <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
            아직 아무 데도 가지 않았어.<br />
            공간 안의 큐브를 스캔하면<br />
            여기에 쌓이기 시작해.
          </p>
        </div>
      ) : (
        <>
          {/* ── 섹션 1: 취향 한 줄 ── */}
          <section className="mb-10">
            <p className="text-xs mb-3" style={{ color: "var(--dim)" }}>
              {displayName}는
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--fg)" }}>
              {tastePhrase}
            </p>
          </section>

          {/* ── 섹션 2: 취향 태그 분포 ── */}
          {topTags.length > 0 && (
            <section className="mb-10 space-y-2">
              {topTags.map(([tag, count]) => {
                const filled = Math.round((count / maxCount) * 10);
                return (
                  <div key={tag} className="flex items-center gap-3 text-xs">
                    <span
                      className="w-16 flex-shrink-0 text-right"
                      style={{ color: "var(--dim)" }}
                    >
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

          <div
            className="mb-8 text-xs"
            style={{ color: "var(--border)" }}
          >
            ─────────────────────────────
          </div>

          {/* ── 섹션 3: 방문 공간 목록 ── */}
          <section className="mb-10 space-y-3">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
              내가 다녀온 곳
            </p>
            {allRecords.map((record) => (
              <Link
                key={record.id}
                href={`/archive/${record.id}`}
                className="flex justify-between items-baseline group"
              >
                <span
                  className="text-sm group-hover:underline"
                  style={{ color: "var(--fg)" }}
                >
                  {record.space.name}
                </span>
                <span
                  className="text-xs flex-shrink-0 ml-4"
                  style={{ color: "var(--dim)" }}
                >
                  {formatDate(record.visitedAt)}
                </span>
              </Link>
            ))}
          </section>

          {/* ── 섹션 4: 감정 문장 ── */}
          {memos.length > 0 && (
            <>
              <div
                className="mb-8 text-xs"
                style={{ color: "var(--border)" }}
              >
                ─────────────────────────────
              </div>

              <section className="mb-10 space-y-4">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
                  그때 내가 남긴 말
                </p>
                {memos.map((record) => (
                  <div key={record.id} className="space-y-1">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--fg)" }}
                    >
                      &ldquo;{record.memo}&rdquo;
                    </p>
                    <p className="text-xs" style={{ color: "var(--dim)" }}>
                      — {record.space.name}
                    </p>
                  </div>
                ))}
              </section>
            </>
          )}

          <div
            className="mb-8 text-xs"
            style={{ color: "var(--border)" }}
          >
            ─────────────────────────────
          </div>

          {/* ── 섹션 5: 컬렉션 ── */}
          <section className="mb-10">
            <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
              묶어둔 곳들
            </p>
            <CollectionManager
              collections={user.collections}
              visitedSpaces={visitedSpaces}
            />
          </section>

          {/* ── 섹션 6: 다시 가고 싶은 곳 ── */}
          {wantAgain.length > 0 && (
            <>
              <div
                className="mb-8 text-xs"
                style={{ color: "var(--border)" }}
              >
                ─────────────────────────────
              </div>

              <section className="mb-10 space-y-3">
                <p className="text-xs mb-4" style={{ color: "var(--dim)" }}>
                  다시 가고 싶었던 곳
                </p>
                {wantAgain.map((record) => (
                  <Link
                    key={record.id}
                    href={`/space/${record.space.slug}`}
                    className="flex items-center gap-2 group"
                  >
                    <span style={{ color: "var(--dim)" }}>·</span>
                    <span
                      className="text-sm group-hover:underline"
                      style={{ color: "var(--fg)" }}
                    >
                      {record.space.name}
                    </span>
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
