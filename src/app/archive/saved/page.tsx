import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import CollectionManager from "@/components/CollectionManager";
import ArchiveTile from "@/components/archive/ArchiveTile";
import ArchiveBottomNav from "@/components/archive/ArchiveBottomNav";
import Divider from "@/components/Divider";
import { isAdmin } from "@/lib/admin";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { getArchiveSavedTiles } from "@/lib/archiveSaved";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "var(--dim)" }}>{children}</p>;
}

export default async function ArchiveSavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Farchive%2Fsaved");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const [collections, visitedSpaceRows, wantAgainRecords] = await Promise.all([
    prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { addedAt: "asc" }, include: { space: true } } },
    }),
    prisma.record.findMany({
      where: { userId: user.id },
      distinct: ["spaceId"],
      select: { space: { select: { id: true, name: true, slug: true } } },
    }),
    // "다시 가고 싶었던 곳" — 레거시 방문자 태그(WANT_AGAIN)를 남긴 기록. ENABLE_RECORD_TAG_SELECTION이
    // 꺼진 뒤로는 새로 쌓이지 않지만, 과거에 남긴 데이터는 그대로 보존해 보여준다.
    prisma.record.findMany({
      where: { userId: user.id, tags: { some: { tag: "WANT_AGAIN" } } },
      orderBy: { visitedAt: "desc" },
      select: { id: true, space: { select: { id: true, name: true, slug: true } } },
    }),
  ]);

  const visitedSpaces = visitedSpaceRows.map((r) => r.space);

  // 공개 공간 저장 + Cube 상세 저장을 하나의 목록으로(src/lib/archiveSaved.ts).
  const savedTiles = await getArchiveSavedTiles(user.id, {
    visitedSpaceIds: new Set(visitedSpaces.map((v) => v.id)),
    editorial: ENABLE_EDITORIAL_HOME || isAdmin(session.user.email),
  });

  const wantAgainMap = new Map<string, (typeof wantAgainRecords)[number]>();
  for (const r of wantAgainRecords) {
    if (!wantAgainMap.has(r.space.id)) wantAgainMap.set(r.space.id, r);
  }
  const wantAgain = [...wantAgainMap.values()];

  return (
    <div className="editorial-bleed">
    <main className="ed-container flex flex-col pt-8 pb-16" style={{ maxWidth: 960 }}>
      <nav className="flex justify-between items-center mb-10">
        <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>← 내 아카이브</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>저장한 공간</p>
      </nav>

      <section className="mb-10">
        <SectionLabel>저장한 공간</SectionLabel>
        {savedTiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {savedTiles.map((t) => <ArchiveTile key={t.key} t={t} />)}
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 저장한 공간이 없습니다<br />마음에 남는 공간을 저장해보세요
          </p>
        )}
      </section>

      <Divider className="my-8" />
      <section className="mb-10">
        <SectionLabel>묶어둔 곳들</SectionLabel>
        <CollectionManager collections={collections} visitedSpaces={visitedSpaces} />
      </section>

      {wantAgain.length > 0 && (
        <>
          <Divider className="my-8" />
          <section className="mb-10">
            <SectionLabel>다시 가고 싶었던 곳</SectionLabel>
            <div className="space-y-3">
              {wantAgain.map((r) => (
                <Link key={r.id} href={`/space/${r.space.slug}`} className="flex items-center gap-3 group">
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span className="text-sm font-medium group-hover:underline">{r.space.name}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <ArchiveBottomNav />
    </main>
    </div>
  );
}
