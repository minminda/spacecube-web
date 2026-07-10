import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import EpisodeList from "./EpisodeList";

interface Props { params: Promise<{ id: string }> }

export default async function SpaceEpisodesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, name: true, slug: true },
  });
  if (!space) notFound();

  const episodes = await prisma.episode.findMany({
    where: { spaceId },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { scenes: true } } },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / EPISODES</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>에피소드 관리</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      <EpisodeList
        spaceId={space.id}
        initialEpisodes={episodes.map((ep) => ({
          id: ep.id,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          unlockVisitCount: ep.unlockVisitCount,
          published: ep.published,
          sceneCount: ep._count.scenes,
        }))}
      />
    </main>
  );
}
