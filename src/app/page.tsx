import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ENABLE_REGION_STORIES, ENABLE_TASTE_STORIES } from "@/lib/features";
import DiscoverEntry from "./DiscoverEntry";

export default async function Home() {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);

  const now = new Date();

  const [regionStory, tasteStory] = await Promise.all([
    ENABLE_REGION_STORIES
      ? prisma.contentStory.findFirst({
          where: { type: "REGION", isActive: true, publishedAt: { not: null, lte: now } },
          orderBy: { publishedAt: "desc" },
          include: {
            storySpaces: {
              orderBy: { order: "asc" },
              take: 3,
              include: { space: { select: { name: true, slug: true } } },
            },
          },
        })
      : Promise.resolve(null),
    ENABLE_TASTE_STORIES
      ? prisma.contentStory.findFirst({
          where: { type: "TASTE", isActive: true, publishedAt: { not: null, lte: now } },
          orderBy: { publishedAt: "desc" },
          include: {
            storySpaces: {
              orderBy: { order: "asc" },
              take: 3,
              include: { space: { select: { name: true, slug: true } } },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const hasStories = regionStory || tasteStory;

  return (
    <main className="flex flex-col min-h-screen px-6 pt-16 pb-12 gap-10">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <h1 className="text-3xl font-bold leading-tight">
          좋은 공간보다,<br />나와 맞는 공간을 발견하세요
        </h1>
      </div>

      {hasStories && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {regionStory && (
              <StoryCard
                href={`/story/${regionStory.slug}`}
                typeLabel="지역 이야기"
                meta={regionStory.district ?? undefined}
                title={regionStory.title}
                intro={regionStory.intro}
                imageUrl={regionStory.imageUrl ?? undefined}
                spaces={regionStory.storySpaces.map((s) => s.space)}
              />
            )}
            {tasteStory && (
              <StoryCard
                href={`/story/${tasteStory.slug}`}
                typeLabel="취향 이야기"
                meta={tasteStory.persona ?? undefined}
                title={tasteStory.title}
                intro={tasteStory.intro}
                imageUrl={tasteStory.imageUrl ?? undefined}
                spaces={tasteStory.storySpaces.map((s) => s.space)}
              />
            )}
          </div>
          <div className="text-right">
            <Link href="/stories" className="text-xs" style={{ color: "var(--dim)" }}>
              이야기 더 보기 →
            </Link>
          </div>
        </>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>어디로 갈까</p>
        <DiscoverEntry />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {session ? (
        <div className="space-y-4">
          <Link
            href="/archive"
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            내 아카이브
          </Link>
          <p className="text-xs text-center" style={{ color: "var(--dim)" }}>공간 안의 큐브를 스캔해서 시작해봐.</p>
          {admin && (
            <Link href="/owner" className="block text-xs text-center py-2" style={{ color: "var(--dim)" }}>
              관리자
            </Link>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          시작하기
        </Link>
      )}
    </main>
  );
}

function StoryCard({
  href, typeLabel, meta, title, intro, imageUrl, spaces,
}: {
  href: string; typeLabel: string; meta?: string; title: string; intro: string;
  imageUrl?: string; spaces: { name: string; slug: string }[];
}) {
  const excerpt = intro.length > 80 ? intro.slice(0, 80).trimEnd() + "…" : intro;

  return (
    <Link href={href} className="block group space-y-3">
      {imageUrl ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }}>
          <Image src={imageUrl} alt={title} fill className="object-cover group-hover:opacity-90 transition-opacity" style={{ aspectRatio: "unset" }} />
        </div>
      ) : (
        <div className="w-full" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }} />
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>{typeLabel}</span>
        {meta && <span className="text-xs" style={{ color: "var(--dim)" }}>{meta}</span>}
      </div>
      <p className="text-base font-semibold leading-snug group-hover:underline">{title}</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{excerpt}</p>
      {spaces.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {spaces.map((space) => (
            <span key={space.slug} className="text-xs" style={{ color: "var(--dim)" }}>{space.name}</span>
          ))}
        </div>
      )}
      <p className="text-xs" style={{ color: "var(--dim)" }}>읽기 →</p>
    </Link>
  );
}
