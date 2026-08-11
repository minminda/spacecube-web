import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { resolveEntryEpisodeId } from "@/lib/episodeEntry";
import EpisodeEditor from "./EpisodeEditor";
import SceneManager from "./SceneManager";

interface Props { params: Promise<{ id: string; episodeId: string }> }

export default async function EpisodeDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId, episodeId } = await params;
  const [space, episode, siblings] = await Promise.all([
    prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true } }),
    prisma.episode.findUnique({
      where: { id: episodeId },
      include: { scenes: { orderBy: { displayOrder: "asc" } } },
    }),
    prisma.episode.findMany({
      where: { spaceId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, published: true, isFeatured: true },
    }),
  ]);
  if (!space || !episode || episode.spaceId !== spaceId) notFound();

  const isEntryEpisode = resolveEntryEpisodeId(siblings) === episode.id;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / EPISODES</p>
          <Link href={`/admin/${spaceId}/episodes`} className="text-xs" style={{ color: "var(--dim)" }}>&lt; 목록</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{space.name} / EP.{episode.episodeNumber}</p>
        <h1 className="text-xl font-bold">{episode.title}</h1>
      </div>

      <EpisodeEditor
        isEntryEpisode={isEntryEpisode}
        episode={{
          id: episode.id,
          title: episode.title,
          description: episode.description ?? "",
          summary: episode.summary ?? "",
          unlockVisitCount: episode.unlockVisitCount,
          published: episode.published,
          imageUrl: episode.imageUrl ?? "",
          imageZoom: episode.imageZoom ?? 1,
          imagePositionX: episode.imagePositionX ?? 0.5,
          imagePositionY: episode.imagePositionY ?? 0.5,
        }}
      />

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <SceneManager
        episodeId={episode.id}
        initialScenes={episode.scenes.map((s) => ({
          id: s.id,
          title: s.title ?? "",
          content: s.content,
          summary: s.summary ?? "",
          isActive: s.isActive,
          imageUrl: s.imageUrl ?? "",
          imageZoom: s.imageZoom ?? 1,
          imagePositionX: s.imagePositionX ?? 0.5,
          imagePositionY: s.imagePositionY ?? 0.5,
          imageAspectRatio: (s.imageAspectRatio as "3/2" | "16/9") ?? "3/2",
        }))}
      />
    </main>
  );
}
