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
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">SPACECUBE / ARCHIVE</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; home</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-3">
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            &gt; 아직 기록이 없어.<br />
            &nbsp;&nbsp;공간 안의 큐브를 스캔해봐.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; 지금까지 <span style={{ color: "var(--fg)" }}>{records.length}곳</span>을 담았어.
          </p>

          {topTags.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "var(--dim)" }}>// 취향 요약</p>
              <div className="space-y-2">
                {topTags.map(([tag, count]) => (
                  <div key={tag} className="flex items-center gap-3 text-xs">
                    <span className="w-20 flex-shrink-0" style={{ color: "var(--dim)" }}>{TAG_LABELS[tag]}</span>
                    <span style={{ color: "var(--border)" }}>
                      {"█".repeat(count)}{"░".repeat(Math.max(0, records.length - count))}
                    </span>
                    <span style={{ color: "var(--dim)" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--dim)" }}>// 기록 목록</p>
            {records.map((record) => (
              <Link
                key={record.id}
                href={`/archive/${record.id}`}
                className="flex gap-4 p-3 border transition-colors hover:border-[var(--fg)]"
                style={{ borderColor: "var(--border)" }}
              >
                {record.space.imageUrl && (
                  <div className="relative w-14 h-14 flex-shrink-0 overflow-hidden">
                    <Image src={record.space.imageUrl} alt={record.space.name} fill className="object-cover opacity-70" />
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
            ))}
          </div>
        </>
      )}
    </main>
  );
}
