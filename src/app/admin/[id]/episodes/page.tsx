import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import EpisodeList from "./EpisodeList";
import { AdminPageHeader } from "@/components/admin/ui";

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
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        title="에피소드"
        description="QR로 이 공간에 들어온 방문자가 읽는 운영자의 이야기입니다. 순서·발행 여부·대표 에피소드를 관리합니다."
      />

      <EpisodeList
        spaceId={space.id}
        initialEpisodes={episodes.map((ep) => ({
          id: ep.id,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          unlockVisitCount: ep.unlockVisitCount,
          published: ep.published,
          isFeatured: ep.isFeatured,
          sceneCount: ep._count.scenes,
        }))}
      />
    </main>
  );
}
