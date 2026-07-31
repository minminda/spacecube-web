import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ENABLE_REGION_STORIES, ENABLE_TASTE_STORIES } from "@/lib/features";
import HomeStoryCard from "./HomeStoryCard";
import QrScanSheet from "./QrScanSheet";
import HomeLogoutButton from "@/components/HomeLogoutButton";
import Divider from "@/components/Divider";

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
    <main className="flex flex-col min-h-screen px-6 pt-24 pb-16 gap-14">
      {/* Hero — 브랜드가 숨 쉴 여백을 두고, 실행 방법은 QR 스캔하기를 눌렀을 때 안내한다(QrScanSheet) */}
      <div className="space-y-10">
        <div className="space-y-8">
          <h1 className="text-5xl font-bold tracking-tight leading-none">공간큐브</h1>
          <p className="text-2xl font-semibold leading-relaxed">
            공간의 이해,<br />사람의 연결
          </p>
        </div>

        <div className="space-y-3">
          <QrScanSheet />
          <Link
            href="/discover"
            className="tap-target block w-full text-center text-base font-semibold py-4 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--fg)" }}
          >
            공간 둘러보기
          </Link>
        </div>
      </div>

      <Divider />

      {/* 아카이브 진입 — 메인 CTA보다 작게 */}
      <div className="text-center space-y-2">
        {session ? (
          <>
            <Link href="/archive" className="block text-sm" style={{ color: "var(--dim)" }}>
              내 아카이브
            </Link>
            <HomeLogoutButton />
            {admin && (
              <Link href="/admin" className="block text-xs" style={{ color: "var(--border)" }}>
                관리자
              </Link>
            )}
          </>
        ) : (
          <Link href="/login" className="text-sm" style={{ color: "var(--dim)" }}>
            로그인하기
          </Link>
        )}
      </div>

      {/* 이야기 — 부가 콘텐츠, 핵심 흐름을 방해하지 않게 맨 아래 */}
      {hasStories && (
        <>
          <Divider />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {regionStory && (
              <HomeStoryCard
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
              <HomeStoryCard
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
    </main>
  );
}
