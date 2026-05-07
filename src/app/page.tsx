import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import DiscoverEntry from "./DiscoverEntry";

export default async function Home() {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);
  const lang = await getLang();

  const now = new Date();

  const [regionStory, tasteStory] = await Promise.all([
    prisma.contentStory.findFirst({
      where: { type: "REGION", isActive: true, publishedAt: { not: null, lte: now } },
      orderBy: { publishedAt: "desc" },
      include: {
        storySpaces: {
          orderBy: { order: "asc" },
          take: 3,
          include: { space: { select: { name: true, slug: true } } },
        },
      },
    }),
    prisma.contentStory.findFirst({
      where: { type: "TASTE", isActive: true, publishedAt: { not: null, lte: now } },
      orderBy: { publishedAt: "desc" },
      include: {
        storySpaces: {
          orderBy: { order: "asc" },
          take: 3,
          include: { space: { select: { name: true, slug: true } } },
        },
      },
    }),
  ]);

  const eyebrow = "공간큐브";
  const heading =
    lang === "ko" ? "공간 경험을 기록하고,\n취향을 발견해봐" :
    lang === "ja" ? "空間の体験を記録して、\n好みを発見しよう" :
    lang === "zh" ? "记录空间体验，\n发现自己的品味" :
                   "Record your spaces,\ndiscover your taste";
  const discoverLabel =
    lang === "ko" ? "어디로 갈까" :
    lang === "ja" ? "どこへ行く" :
    lang === "zh" ? "去哪里" : "Where to";
  const archiveLabel =
    lang === "ko" ? "내 아카이브" :
    lang === "ja" ? "マイアーカイブ" :
    lang === "zh" ? "我的档案" : "My Archive";
  const scanHint =
    lang === "ko" ? "공간 안의 큐브를 스캔해서 시작해봐." :
    lang === "ja" ? "空間内のキューブをスキャンして始めよう。" :
    lang === "zh" ? "扫描空间内的方块开始体验。" :
                   "Scan the cube inside a space to begin.";
  const adminLabel =
    lang === "ko" ? "관리자" : lang === "ja" ? "管理者" :
    lang === "zh" ? "管理员" : "Admin";
  const startLabel =
    lang === "ko" ? "시작하기" : lang === "ja" ? "始める" :
    lang === "zh" ? "开始" : "Get Started";

  const hasStories = regionStory || tasteStory;

  return (
    <main className="flex flex-col min-h-screen px-6 pt-16 pb-12 gap-10">
      {/* Hero */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{eyebrow}</p>
        <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">{heading}</h1>
      </div>

      {/* 콘텐츠 레이어 */}
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

      {/* Discover */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{discoverLabel}</p>
        <DiscoverEntry lang={lang} />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* CTA */}
      {session ? (
        <div className="space-y-4">
          <Link
            href="/archive"
            className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {archiveLabel}
          </Link>
          <p className="text-xs text-center" style={{ color: "var(--dim)" }}>{scanHint}</p>
          {admin && (
            <Link
              href="/owner"
              className="block text-xs text-center py-2"
              style={{ color: "var(--dim)" }}
            >
              {adminLabel}
            </Link>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          {startLabel}
        </Link>
      )}

      {/* 조용한 소개 링크 */}
      <div className="text-center pt-2">
        <Link href="/about" className="text-xs" style={{ color: "var(--border)" }}>
          {lang === "ko" ? "공간큐브가 뭔가요? →" : lang === "ja" ? "SpaceCubeとは？ →" : lang === "zh" ? "什么是空间魔方？ →" : "About SpaceCube →"}
        </Link>
      </div>
    </main>
  );
}

function StoryCard({
  href,
  typeLabel,
  meta,
  title,
  intro,
  imageUrl,
  spaces,
}: {
  href: string;
  typeLabel: string;
  meta?: string;
  title: string;
  intro: string;
  imageUrl?: string;
  spaces: { name: string; slug: string }[];
}) {
  const excerpt = intro.length > 80 ? intro.slice(0, 80).trimEnd() + "…" : intro;

  return (
    <Link href={href} className="block group space-y-3">
      {/* 썸네일 이미지 */}
      {imageUrl ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }}>
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:opacity-90 transition-opacity"
            style={{ aspectRatio: "unset" }}
          />
        </div>
      ) : (
        <div className="w-full" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }} />
      )}

      {/* 타입 + 메타 */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 border"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          {typeLabel}
        </span>
        {meta && <span className="text-xs" style={{ color: "var(--dim)" }}>{meta}</span>}
      </div>

      {/* 제목 */}
      <p className="text-base font-semibold leading-snug group-hover:underline">{title}</p>

      {/* 발췌 */}
      <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{excerpt}</p>

      {/* 관련 공간 */}
      {spaces.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {spaces.map((space) => (
            <span key={space.slug} className="text-xs" style={{ color: "var(--dim)" }}>
              {space.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--dim)" }}>읽기 →</p>
    </Link>
  );
}
