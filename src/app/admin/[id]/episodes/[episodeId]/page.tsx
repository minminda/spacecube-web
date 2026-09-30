import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import EpisodeEditor from "./EpisodeEditor";
import SceneManager from "./SceneManager";
import { AdminPageHeader } from "@/components/admin/ui";

interface Props { params: Promise<{ id: string; episodeId: string }> }

export default async function EpisodeDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId, episodeId } = await params;
  const [space, episode] = await Promise.all([
    prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true } }),
    prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        scenes: {
          orderBy: { displayOrder: "asc" },
          include: { images: { orderBy: { displayOrder: "asc" } } },
        },
      },
    }),
  ]);
  if (!space || !episode || episode.spaceId !== spaceId) notFound();

  return (
    <main className="flex flex-col gap-8">

      <AdminPageHeader
        breadcrumb={[{ label: "에피소드", href: `/admin/${spaceId}/episodes` }, { label: `EP.${episode.episodeNumber}` }]}
        title={episode.title}
        description="에피소드 기본 정보와 Scene(본문 블록)을 편집합니다."
      />

      <EpisodeEditor
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
          imageFit: (s.imageFit as "cover" | "contain") ?? "cover",
          images: s.images.map((img) => ({ imageUrl: img.imageUrl, width: img.width, height: img.height })),
        }))}
      />
    </main>
  );
}
