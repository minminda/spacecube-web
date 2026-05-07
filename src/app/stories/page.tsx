import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이야기 — 공간큐브",
  description: "지역 이야기와 취향 이야기를 모아봤습니다.",
};

const PER_PAGE = 6;

type StoryType = "REGION" | "TASTE";

interface Props {
  searchParams: Promise<{ page?: string; type?: string }>;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const range: number[] = [];
  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) range.push(i);

  const pages: (number | "…")[] = [1];
  if (range[0] > 2) pages.push("…");
  pages.push(...range);
  if (range[range.length - 1] < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export default async function StoriesPage({ searchParams }: Props) {
  const { page: pageParam, type: typeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const typeFilter: StoryType | null =
    typeParam === "REGION" ? "REGION" : typeParam === "TASTE" ? "TASTE" : null;

  const now = new Date();
  const where = {
    isActive: true,
    publishedAt: { not: null as null, lte: now },
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const [stories, total] = await Promise.all([
    prisma.contentStory.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        storySpaces: {
          orderBy: { order: "asc" },
          take: 3,
          include: { space: { select: { name: true, slug: true } } },
        },
      },
    }),
    prisma.contentStory.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/stories${qs ? `?${qs}` : ""}`;
  }

  function typeHref(t: StoryType | null) {
    const params = new URLSearchParams();
    if (t) params.set("type", t);
    const qs = params.toString();
    return `/stories${qs ? `?${qs}` : ""}`;
  }

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <main className="flex flex-col min-h-screen px-6 py-10 gap-8 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
          <h1 className="text-xl font-bold">이야기</h1>
        </div>
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 타입 필터 */}
      <div className="flex gap-2">
        {([null, "REGION", "TASTE"] as (StoryType | null)[]).map((t) => {
          const label = t === null ? "전체" : t === "REGION" ? "지역 이야기" : "취향 이야기";
          const active = typeFilter === t;
          return (
            <Link
              key={label}
              href={typeHref(t)}
              className="text-xs px-3 py-1.5 border transition-colors"
              style={{
                borderColor: active ? "var(--fg)" : "var(--border)",
                background: active ? "var(--fg)" : "transparent",
                color: active ? "var(--bg)" : "var(--dim)",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* 이야기 목록 */}
      {stories.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 발행된 이야기가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              href={`/story/${story.slug}`}
              typeLabel={story.type === "REGION" ? "지역 이야기" : "취향 이야기"}
              meta={story.type === "REGION" ? (story.district ?? undefined) : (story.persona ?? undefined)}
              title={story.title}
              intro={story.intro}
              imageUrl={story.imageUrl ?? undefined}
              spaces={story.storySpaces.map((s) => s.space)}
            />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <nav className="flex items-center justify-center gap-1">
            {/* 이전 */}
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                ←
              </Link>
            ) : (
              <span
                className="text-xs px-3 py-2 border opacity-30 cursor-default"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                ←
              </span>
            )}

            {/* 번호 */}
            {pageNumbers.map((num, i) =>
              num === "…" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="text-xs px-2 py-2"
                  style={{ color: "var(--border)" }}
                >
                  …
                </span>
              ) : (
                <Link
                  key={num}
                  href={pageHref(num)}
                  className="text-xs w-8 h-8 flex items-center justify-center border transition-colors"
                  style={
                    num === page
                      ? { borderColor: "var(--fg)", background: "var(--fg)", color: "var(--bg)" }
                      : { borderColor: "var(--border)", color: "var(--dim)" }
                  }
                >
                  {num}
                </Link>
              )
            )}

            {/* 다음 */}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                →
              </Link>
            ) : (
              <span
                className="text-xs px-3 py-2 border opacity-30 cursor-default"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                →
              </span>
            )}
          </nav>
          <p className="text-xs text-center" style={{ color: "var(--border)" }}>
            {total}개 이야기 중 {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)}
          </p>
        </>
      )}
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
      {imageUrl ? (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }}
        >
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

      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 border"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          {typeLabel}
        </span>
        {meta && <span className="text-xs" style={{ color: "var(--dim)" }}>{meta}</span>}
      </div>

      <p className="text-base font-semibold leading-snug group-hover:underline">{title}</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{excerpt}</p>

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
