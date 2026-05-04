import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }> }

type Block =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption?: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = await prisma.contentStory.findUnique({ where: { slug }, select: { title: true, intro: true, imageUrl: true } });
  if (!story) return {};
  const description = story.intro.slice(0, 120);
  return {
    title: `${story.title} — 공간큐브`,
    description,
    openGraph: { title: story.title, description, images: story.imageUrl ? [{ url: story.imageUrl }] : [], type: "article" },
    twitter: { card: "summary_large_image", title: story.title, description, images: story.imageUrl ? [story.imageUrl] : [] },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await prisma.contentStory.findUnique({
    where: { slug, isActive: true },
    include: {
      storySpaces: {
        orderBy: { order: "asc" },
        include: {
          space: {
            select: { id: true, name: true, slug: true, type: true, district: true, imageUrl: true, tagline: true, location: true },
          },
        },
      },
    },
  });
  if (!story) notFound();

  const typeLabel = story.type === "REGION" ? "지역 이야기" : "취향 이야기";
  const typeMeta = story.type === "REGION" ? story.district : story.persona;

  // bodyBlocks가 있으면 사용, 없으면 body 텍스트를 단일 블록으로 처리
  const blocks: Block[] = Array.isArray(story.bodyBlocks) && story.bodyBlocks.length > 0
    ? (story.bodyBlocks as Block[])
    : [{ type: "text", content: story.body }];

  return (
    <main className="flex flex-col min-h-screen">
      {/* 히어로 이미지 */}
      {story.imageUrl && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
          <Image
            src={story.imageUrl}
            alt={story.title}
            fill
            className="object-cover"
            priority
            style={{ aspectRatio: "unset" }}
          />
        </div>
      )}

      {/* 헤더 */}
      <div className="px-6 pt-10 pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        </div>

        {/* 타입 배지 */}
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-2 py-0.5 border"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {typeLabel}
          </span>
          {typeMeta && (
            <span className="text-xs" style={{ color: "var(--dim)" }}>{typeMeta}</span>
          )}
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold leading-tight">{story.title}</h1>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 도입부 */}
      <div className="px-6 py-8">
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
          {story.intro}
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 본문 블록 */}
      <div className="py-2">
        {blocks.map((block, i) =>
          block.type === "text" ? (
            <div key={i} className="px-6 py-6">
              <p className="text-sm leading-loose whitespace-pre-line">
                {block.content}
              </p>
            </div>
          ) : (
            <div key={i} className="py-4">
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
                <Image
                  src={block.url}
                  alt={block.caption ?? ""}
                  fill
                  className="object-cover"
                  style={{ aspectRatio: "unset" }}
                />
              </div>
              {block.caption && (
                <p className="px-6 pt-2 text-xs" style={{ color: "var(--border)" }}>
                  {block.caption}
                </p>
              )}
            </div>
          )
        )}
      </div>

      {/* 관련 공간 */}
      {story.storySpaces.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <div className="px-6 py-8 space-y-5">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
              {story.type === "REGION" ? "이 동네의 공간" : "이 취향의 공간"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {story.storySpaces.map(({ space }) => (
                <Link key={space.id} href={`/space/${space.slug}`} className="flex gap-4 group">
                  {space.imageUrl ? (
                    <div className="relative flex-shrink-0 w-20 h-20 overflow-hidden" style={{ background: "var(--tag-bg)" }}>
                      <Image src={space.imageUrl} alt={space.name} fill className="object-cover group-hover:opacity-80 transition-opacity" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-20 h-20" style={{ background: "var(--tag-bg)" }} />
                  )}
                  <div className="flex flex-col justify-center gap-1 min-w-0">
                    <p className="text-sm font-medium leading-snug group-hover:underline">{space.name}</p>
                    {space.tagline && (
                      <p className="text-xs leading-snug truncate" style={{ color: "var(--dim)" }}>{space.tagline}</p>
                    )}
                    <p className="text-xs" style={{ color: "var(--dim)" }}>
                      {[space.type, space.district].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* CTA */}
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <div className="px-6 py-8 space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          {story.cta ?? "이 흐름 따라가기"}
        </p>
        <Link
          href={`/discover${story.district ? `?district=${encodeURIComponent(story.district)}` : ""}`}
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          공간 둘러보기 →
        </Link>
      </div>

      {/* 조용한 소개 링크 */}
      <div className="px-6 pb-10 text-center">
        <Link href="/about" className="text-xs" style={{ color: "var(--border)" }}>
          공간큐브가 뭔가요? →
        </Link>
      </div>
    </main>
  );
}
