import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface Props {
  params: Promise<{ slug: string; episodeId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { episodeId } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { title: true, description: true, space: { select: { name: true } } },
  });
  if (!episode) return {};
  return {
    title: `${episode.title} — ${episode.space.name} — 공간큐브`,
    description: episode.description ?? undefined,
  };
}

export default async function EpisodeDetailPage({ params }: Props) {
  const { slug, episodeId } = await params;

  const [space, session] = await Promise.all([
    prisma.space.findUnique({ where: { slug, isActive: true }, select: { id: true, name: true, slug: true } }),
    auth(),
  ]);
  if (!space) notFound();

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { scenes: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
  });
  if (!episode || episode.spaceId !== space.id || !episode.published) notFound();

  let visitCount = 0;
  let userId: string | null = null;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (user) {
      userId = user.id;
      visitCount = await prisma.record.count({ where: { userId: user.id, spaceId: space.id } });
    }
  }

  const unlocked = episode.unlockVisitCount <= visitCount;

  if (!unlocked) {
    const remaining = episode.unlockVisitCount - visitCount;
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          {remaining <= 1 ? "이 이야기는 다음 방문에서 열려요." : `이 이야기는 앞으로 ${remaining}번 더 방문하면 열려요.`}
        </p>
        <Link href={`/space/${space.slug}`} className="text-xs" style={{ color: "var(--border)" }}>← {space.name}로 돌아가기</Link>
      </main>
    );
  }

  // 열람 가능한 상태에서 페이지를 열었으므로 읽음으로 기록
  if (userId) {
    await prisma.episodeRead.upsert({
      where: { userId_episodeId: { userId, episodeId: episode.id } },
      create: { userId, episodeId: episode.id, completedAt: new Date() },
      update: { completedAt: new Date() },
    });
  }

  const [prevEpisode, nextEpisode] = await Promise.all([
    prisma.episode.findFirst({
      where: { spaceId: space.id, published: true, displayOrder: { lt: episode.displayOrder } },
      orderBy: { displayOrder: "desc" },
      select: { id: true, episodeNumber: true, title: true },
    }),
    prisma.episode.findFirst({
      where: { spaceId: space.id, published: true, displayOrder: { gt: episode.displayOrder } },
      orderBy: { displayOrder: "asc" },
      select: { id: true, episodeNumber: true, title: true },
    }),
  ]);

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="flex items-center justify-between">
        <Link href={`/space/${space.slug}`} className="text-xs" style={{ color: "var(--dim)" }}>← {space.name}</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>EP.{episode.episodeNumber}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{episode.title}</h1>
          {episode.description && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{episode.description}</p>
          )}
        </div>

        {episode.imageUrl && (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: episode.imageAspectRatio ?? "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={episode.imageUrl}
              alt={episode.title}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${(episode.imagePositionX ?? 0.5) * 100}% ${(episode.imagePositionY ?? 0.5) * 100}%`,
                transform: `scale(${episode.imageZoom ?? 1})`,
                transformOrigin: "center center",
              }}
            />
          </div>
        )}
      </div>

      <div className="space-y-10">
        {episode.scenes.map((scene) => (
          <div key={scene.id} className="space-y-3">
            {scene.imageUrl && (
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: scene.imageAspectRatio ?? "3/2" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scene.imageUrl}
                  alt={scene.title ?? ""}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${(scene.imagePositionX ?? 0.5) * 100}% ${(scene.imagePositionY ?? 0.5) * 100}%`,
                    transform: `scale(${scene.imageZoom ?? 1})`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            )}
            {scene.title && <p className="text-sm font-medium">{scene.title}</p>}
            {scene.content && (
              <p className="text-base leading-8 whitespace-pre-line">{scene.content}</p>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="flex justify-between text-sm gap-4">
        {prevEpisode ? (
          <Link href={`/space/${space.slug}/episodes/${prevEpisode.id}`} className="min-w-0 hover:underline" style={{ color: "var(--dim)" }}>
            ← EP.{prevEpisode.episodeNumber} {prevEpisode.title}
          </Link>
        ) : <span />}
        {nextEpisode ? (
          <Link href={`/space/${space.slug}/episodes/${nextEpisode.id}`} className="min-w-0 text-right hover:underline" style={{ color: "var(--dim)" }}>
            EP.{nextEpisode.episodeNumber} {nextEpisode.title} →
          </Link>
        ) : <span />}
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={`/space/${space.slug}/guestbook`}
          className="block w-full text-center text-sm py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          방문자들의 흔적 보러 가기
        </Link>
        <Link href={`/space/${space.slug}`} className="text-xs text-center py-1" style={{ color: "var(--border)" }}>
          공간 페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}
