import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { Tag } from "@prisma/client";

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
    },
  });

  if (!user) redirect("/login");

  const records = user.records;

  // 취향 요약: 태그 빈도 계산
  const tagCount: Partial<Record<Tag, number>> = {};
  for (const record of records) {
    for (const rt of record.tags) {
      tagCount[rt.tag] = (tagCount[rt.tag] ?? 0) + 1;
    }
  }
  const topTags = (Object.entries(tagCount) as [Tag, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">내 아카이브</h1>
        <Link href="/" className="text-xs" style={{ color: "var(--muted)" }}>홈</Link>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="text-4xl font-thin" style={{ color: "var(--border)" }}>□</div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            아직 기록이 없어.<br />
            공간 안의 큐브를 스캔해봐.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            지금까지 <span style={{ color: "var(--fg)" }} className="font-medium">{records.length}곳</span>을 담았어.
          </p>

          {/* 취향 요약 */}
          {topTags.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium" style={{ color: "var(--muted)" }}>취향 요약</h2>
              <div className="space-y-2">
                {topTags.map(([tag, count]) => (
                  <div key={tag} className="flex items-center gap-3">
                    <span className="text-sm w-24 flex-shrink-0">{TAG_LABELS[tag]}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: "var(--fg)",
                          width: `${(count / records.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs w-4 text-right" style={{ color: "var(--muted)" }}>{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 기록 목록 */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium" style={{ color: "var(--muted)" }}>기록 목록</h2>
            <div className="space-y-3">
              {records.map((record) => (
                <Link
                  key={record.id}
                  href={`/archive/${record.id}`}
                  className="flex gap-4 p-4 rounded-2xl"
                  style={{ background: "var(--tag-bg)" }}
                >
                  <div
                    className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "var(--border)" }}
                  >
                    {record.space.imageUrl ? (
                      <Image
                        src={record.space.imageUrl}
                        alt={record.space.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-xl font-thin" style={{ color: "var(--muted)" }}>□</span>
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-1 min-w-0">
                    <p className="text-sm font-medium truncate">{record.space.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                      {record.tags.map((t) => TAG_LABELS[t.tag]).join(" · ")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(record.visitedAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
