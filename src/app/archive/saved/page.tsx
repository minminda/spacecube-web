import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import CollectionManager from "@/components/CollectionManager";
import RecommendationPlaylist, { type PlaylistCard } from "@/components/RecommendationPlaylist";
import ArchiveBottomNav from "@/components/archive/ArchiveBottomNav";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import { visibleTagNames } from "@/lib/recommend";

function Divider() {
  return <div className="my-8" style={{ borderTop: "1px solid var(--border)" }} />;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "var(--dim)" }}>{children}</p>;
}

export default async function ArchiveSavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const [savedSpaces, collections, visitedSpaceRows, wantAgainRecords] = await Promise.all([
    prisma.savedSpace.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        space: {
          select: {
            id: true, name: true, slug: true, type: true, district: true, imageUrl: true, tagline: true,
            spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
          },
        },
      },
    }),
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

  const savedSpaceCards: PlaylistCard[] = savedSpaces.map((s) => ({
    id: s.space.id,
    slug: s.space.slug,
    name: s.space.name,
    district: s.space.district,
    imageUrl: s.space.imageUrl,
    tagLabels: visibleTagNames(s.space.spaceTagLinks),
    reason: s.space.tagline ?? [resolveSpaceTypeLabel(s.space.spaceTagLinks, s.space.type), s.space.district].filter(Boolean).join(" · "),
  }));

  const wantAgainMap = new Map<string, (typeof wantAgainRecords)[number]>();
  for (const r of wantAgainRecords) {
    if (!wantAgainMap.has(r.space.id)) wantAgainMap.set(r.space.id, r);
  }
  const wantAgain = [...wantAgainMap.values()];

  return (
    <main className="flex flex-col min-h-screen px-6 pt-8 pb-16">
      <nav className="flex justify-between items-center mb-10">
        <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>← 공간 노트</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>저장한 공간</p>
      </nav>

      <section className="mb-10">
        <SectionLabel>저장한 공간</SectionLabel>
        {savedSpaceCards.length > 0 ? (
          <RecommendationPlaylist cards={savedSpaceCards} />
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 저장한 공간이 없습니다.<br />마음에 남는 공간을 저장해보세요.
          </p>
        )}
      </section>

      <Divider />
      <section className="mb-10">
        <SectionLabel>묶어둔 곳들</SectionLabel>
        <CollectionManager collections={collections} visitedSpaces={visitedSpaces} />
      </section>

      {wantAgain.length > 0 && (
        <>
          <Divider />
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
  );
}
