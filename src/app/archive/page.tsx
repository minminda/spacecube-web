import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { Tag } from "@prisma/client";
import ArchiveSearch from "./ArchiveSearch";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

function getTastePhrase(topTags: [Tag, number][]): string {
  if (topTags.length === 0) return "나만의 공간을 탐험하는 사람";
  const tags = topTags.map(([tag]) => tag);

  if (tags.includes("QUIET") && tags.includes("FOCUSED"))    return "조용히 집중할 수 있는 공간을 좋아하는 사람";
  if (tags.includes("QUIET") && tags.includes("INSPIRING"))  return "조용히 영감을 얻는 공간을 찾는 사람";
  if (tags.includes("QUIET") && tags.includes("COMFORTABLE"))return "조용하고 편안한 공간에서 오래 머무는 사람";
  if (tags.includes("WARM") && tags.includes("COMFORTABLE")) return "따뜻하고 편안한 분위기를 즐기는 사람";
  if (tags.includes("UNIQUE") && tags.includes("INSPIRING")) return "독특하고 영감 있는 공간을 탐험하는 사람";
  if (tags.includes("SENSIBLE") && tags.includes("UNIQUE"))  return "감각적이고 독특한 공간을 발견하는 사람";
  if (tags.includes("INSPIRING") && tags.includes("SENSIBLE"))return "영감 있고 감각적인 공간에 끌리는 사람";
  if (tags.includes("COMFORTABLE") && tags.includes("WANT_AGAIN")) return "편안해서 다시 찾고 싶은 공간을 좋아하는 사람";

  const fallback: Partial<Record<Tag, string>> = {
    QUIET:      "조용한 공간에서 오래 머무는 사람",
    INSPIRING:  "영감을 주는 공간을 찾는 사람",
    COMFORTABLE:"편안한 공간을 즐기는 사람",
    UNIQUE:     "독특한 공간을 탐험하는 사람",
    WANT_AGAIN: "다시 찾고 싶은 공간을 만드는 사람",
    SENSIBLE:   "감각 있는 공간에 끌리는 사람",
    WARM:       "따뜻한 분위기의 공간을 좋아하는 사람",
    FOCUSED:    "집중할 수 있는 공간을 선호하는 사람",
  };
  return fallback[tags[0]] ?? "나만의 공간을 탐험하는 사람";
}

export default async function ArchivePage({ searchParams }: Props) {
  const { q } = await searchParams;
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      records: {
        orderBy: { visitedAt: "desc" },
        include: { space: true, tags: true },
      },
    },
  });
  if (!user) redirect("/login");

  const allRecords = user.records;

  // 취향 요약용 전체 태그 집계
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
  const recentThree = allRecords.slice(0, 3);

  // 검색 필터 (기록 리스트에만 적용)
  const filteredRecords = q
    ? allRecords.filter((r) => r.space.name.includes(q))
    : allRecords;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      {/* 헤더 */}
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between items-center">
          <p className="text-xs">SPACECUBE / ARCHIVE</p>
          <div className="flex items-center gap-3">
            <ArchiveSearch defaultValue={q} />
            <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; home</Link>
          </div>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      {allRecords.length === 0 ? (
        /* 빈 상태 */
        <div className="flex-1 flex flex-col justify-center gap-3">
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            &gt; 아직 기록이 없어.<br />
            &nbsp;&nbsp;공간 안의 큐브를 스캔해봐.
          </p>
        </div>
      ) : (
        <>
          {/* ── 섹션 1: 취향 요약 ── */}
          <div className="space-y-5">
            <p className="text-xs" style={{ color: "var(--dim)" }}>// 나의 취향</p>

            {/* 한 줄 문장 */}
            <p className="text-sm" style={{ color: "var(--fg)" }}>
              &quot;{tastePhrase}&quot;
            </p>

            {/* 태그 분포 */}
            {topTags.length > 0 && (
              <div className="space-y-2">
                {topTags.map(([tag, count]) => {
                  const filled = Math.round((count / maxCount) * 8);
                  return (
                    <div key={tag} className="flex items-center gap-3 text-xs">
                      <span className="w-20 flex-shrink-0" style={{ color: "var(--dim)" }}>
                        {TAG_LABELS[tag]}
                      </span>
                      <span style={{ color: "var(--fg)", letterSpacing: "1px" }}>
                        {"█".repeat(filled)}
                        <span style={{ color: "var(--border)" }}>{"░".repeat(8 - filled)}</span>
                      </span>
                      <span style={{ color: "var(--dim)" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 최근 방문 3곳 */}
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>// 최근 방문</p>
              <div className="flex gap-3">
                {recentThree.map((record) => (
                  <Link
                    key={record.id}
                    href={`/archive/${record.id}`}
                    className="flex-1 min-w-0 space-y-1 group"
                  >
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: "1 / 1", border: "1px solid var(--border)" }}
                    >
                      {record.space.imageUrl ? (
                        <Image
                          src={record.space.imageUrl}
                          alt={record.space.name}
                          fill
                          className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: "var(--border)" }} />
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--dim)" }}>
                      {record.space.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

          {/* ── 섹션 2: 기록 리스트 ── */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs" style={{ color: "var(--dim)" }}>// 기록 목록</p>
              {q && (
                <p className="text-xs" style={{ color: "var(--dim)" }}>
                  &quot;{q}&quot; — {filteredRecords.length}건
                </p>
              )}
            </div>

            {filteredRecords.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                &gt; 검색 결과가 없어.
              </p>
            ) : (
              filteredRecords.map((record) => (
                <Link
                  key={record.id}
                  href={`/archive/${record.id}`}
                  className="flex gap-4 p-3 border transition-colors hover:border-[var(--fg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {record.space.imageUrl && (
                    <div className="relative w-14 h-14 flex-shrink-0 overflow-hidden">
                      <Image
                        src={record.space.imageUrl}
                        alt={record.space.name}
                        fill
                        className="object-cover opacity-70"
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-center gap-1 min-w-0">
                    <p className="text-sm truncate">&gt; {record.space.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--dim)" }}>
                      {record.tags.map((t) => `[${TAG_LABELS[t.tag]}]`).join(" ")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--dim)" }}>
                      {new Date(record.visitedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

          {/* ── 섹션 3: 탐험 확장 ── */}
          <div className="space-y-3 pb-4">
            <p className="text-xs" style={{ color: "var(--dim)" }}>// 다음 탐험</p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              &gt; 이런 공간도 좋아할 수 있어요.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="text-xs px-3 py-2 border transition-colors hover:border-[var(--fg)]"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                이 취향 더 탐험하기 _
              </Link>
              <Link
                href="/"
                className="text-xs px-3 py-2 border transition-colors hover:border-[var(--fg)]"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                조금 다른 분위기 보기 _
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
