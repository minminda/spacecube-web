import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import { aggregateTags, getTastePhrase } from "@/lib/taste";
import type { Metadata } from "next";
import { type StoryItem } from "./SpaceStory";
import StoryTabs from "./StoryTabs";
import ScanTracker from "@/components/ScanTracker";
import SpaceUnlockScreen from "./SpaceUnlockScreen";
import { ENABLE_GUESTBOOK_WALL } from "@/lib/features";
import { aggregateSpaceTags, getSpaceUsageSummary } from "@/lib/spaceInsight";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true }, select: { name: true, tagline: true, description: true, imageUrl: true } });
  if (!space) return {};
  const description = space.tagline ?? space.description.slice(0, 100);
  return {
    title: `${space.name} — 공간큐브`, description,
    openGraph: { title: space.name, description, images: space.imageUrl ? [{ url: space.imageUrl }] : [], type: "website" },
    twitter: { card: "summary_large_image", title: space.name, description, images: space.imageUrl ? [space.imageUrl] : [] },
  };
}

function getVisitMessage(visitCount: number, firstVisitAt: Date | null): string | null {
  if (visitCount < 2) return null;
  const ordinals = ["두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
  const daysSince = firstVisitAt
    ? Math.floor((Date.now() - firstVisitAt.getTime()) / 86_400_000)
    : 0;
  const ordinal = visitCount <= 10 ? ordinals[visitCount - 2] : null;
  const base = ordinal ? `${ordinal} 번째 방문이네요.` : `이 공간과 ${visitCount}번 함께했네요.`;
  if (daysSince >= 7) return `${base} 처음 기록 이후 ${daysSince}일 만에 다시 왔어요.`;
  return base;
}

export default async function SpacePage({ params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true } });
  if (!space) notFound();

  const session = await auth();

  let visitCount = 0;
  let firstVisitAt: Date | null = null;
  let hasRecord = false;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const userRecords = await prisma.record.findMany({
        where: { userId: user.id, spaceId: space.id },
        orderBy: { visitedAt: "asc" },
        select: { visitedAt: true },
      });
      visitCount = userRecords.length;
      firstVisitAt = userRecords[0]?.visitedAt ?? null;
      hasRecord = visitCount > 0;
    }
  }

  const visitMessage = getVisitMessage(visitCount, firstVisitAt);
  const firstVisitPrompt = !hasRecord && session;

  // 메모 또는 태그가 있는 기록을 최근 순으로 조회 (공개 가능한 방문자 기록)
  const anonymousReactions = await prisma.record.findMany({
    where: {
      spaceId: space.id,
      OR: [
        { memo: { not: null } },
        { tags: { some: {} } },
      ],
    },
    include: { tags: true },
    orderBy: { visitedAt: "desc" },
    take: 5,
  });

  const allTagRecords = await prisma.record.findMany({
    where: { spaceId: space.id },
    include: { tags: true },
  });
  const spaceTopTags = aggregateSpaceTags(allTagRecords);
  const usageSummary = getSpaceUsageSummary(spaceTopTags);

  // MVP 기간 반응 통계 섹션 비활성화 — true로 바꾸면 즉시 원상복구
  const SHOW_REACTION_BOARD = false;

  const visitorRecords = await prisma.record.findMany({
    where: { spaceId: space.id, user: { visibility: "PARTIAL" } },
    include: {
      tags: true,
      user: {
        include: {
          records: {
            include: { space: { select: { id: true, name: true, slug: true } }, tags: true },
            orderBy: { visitedAt: "desc" },
            take: 20,
          },
        },
      },
    },
    orderBy: { visitedAt: "desc" },
    take: 10,
  });

  const seenUserIds = new Set<string>();
  const similarTasteCards = visitorRecords
    .filter((r) => {
      if (seenUserIds.has(r.user.id)) return false;
      seenUserIds.add(r.user.id);
      return true;
    })
    .slice(0, 3)
    .map((r) => {
      const phrase = getTastePhrase(aggregateTags(r.user.records).slice(0, 5));
      const seenSpaces = new Set<string>([space.id]);
      const otherSpaces = r.user.records
        .filter((ur) => {
          if (seenSpaces.has(ur.space.id)) return false;
          seenSpaces.add(ur.space.id);
          return true;
        })
        .slice(0, 3)
        .map((ur) => ur.space);
      return { userId: r.user.id, phrase, memo: r.memo, otherSpaces };
    })
    .filter((c) => c.otherSpaces.length > 0);

  return (
    <main className="flex flex-col min-h-screen md:flex-row">
      {space.imageUrl && (
        <div
          className="relative w-full flex-shrink-0 md:w-1/2 md:sticky md:top-0 md:self-start md:h-screen"
          style={{ aspectRatio: "16 / 11" }}
        >
          <Image src={space.imageUrl} alt={space.name} fill className="object-cover" style={{ aspectRatio: "unset" }} />
        </div>
      )}

      <Suspense fallback={null}>
        <ScanTracker spaceId={space.id} />
        <SpaceUnlockScreen />
      </Suspense>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex flex-col gap-6 px-6 py-6 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
            <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold leading-tight">{space.name}</h1>
            {space.tagline && (
              <p className="text-sm leading-relaxed italic" style={{ color: "var(--dim)" }}>{space.tagline}</p>
            )}
          </div>

          {space.currentMood && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <section className="space-y-1.5">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>지금의 공간</p>
                <p className="text-sm leading-relaxed pl-3" style={{ borderLeft: "2px solid var(--border)", color: "var(--dim)" }}>
                  {space.currentMood}
                </p>
              </section>
            </>
          )}

          <div style={{ borderTop: "1px solid var(--border)" }} />
          <div className="space-y-2 text-sm" style={{ color: "var(--dim)" }}>
            {space.naverMapUrl ? (
              <a href={space.naverMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:underline">
                <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">위치</span>
                <span>{space.location} ↗</span>
              </a>
            ) : (
              <div className="flex items-start gap-3">
                <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">위치</span>
                <span>{space.location}</span>
              </div>
            )}
            {space.openingHours && (
              <div className="flex items-start gap-3">
                <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">운영</span>
                <span>{space.openingHours}</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <StoryTabs
            description={space.description}
            philosophy={space.philosophy}
            ownerMessage={space.ownerMessage}
            experienceGuide={space.experienceGuide}
            spacePoints={space.spacePoints}
            storyItems={space.storyItems as StoryItem[] | null}
            ownerName={space.ownerName}
            ownerPhotoUrl={space.ownerPhotoUrl}
            ownerBio={space.ownerBio}
            ownerValues={space.ownerValues}
            ownerPlaylistUrl={space.ownerPlaylistUrl}
            ownerBlogUrl={space.ownerBlogUrl}
            ownerSocialUrl={space.ownerSocialUrl}
          />

          {/* 디지털 방명록 — 운영자 이야기 이후 발견되는 흔적 페이지 입구 */}
          {ENABLE_GUESTBOOK_WALL && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <section className="space-y-5">
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
                  {"이 공간에는\n다른 사람들의 흔적도 남아 있습니다."}
                </p>
                <Link
                  href={`/space/${space.slug}/guestbook`}
                  className="inline-block text-sm py-2.5 px-5 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
                  style={{ borderColor: "var(--fg)" }}
                >
                  방문자들의 이야기 열어보기 →
                </Link>
              </section>
            </>
          )}

          {/* 반응보드 통계 — MVP 기간 비활성 (SHOW_REACTION_BOARD = true 로 복구) */}
          {SHOW_REACTION_BOARD && usageSummary && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <p className="text-sm leading-relaxed pl-3" style={{ borderLeft: "2px solid var(--border)", color: "var(--dim)" }}>
                {usageSummary}
              </p>
            </>
          )}

          {/* 방문자 기록 리스트 — 방명록 실험 중에는 중복이라 숨김 (실험 종료 시 복구) */}
          {!ENABLE_GUESTBOOK_WALL && anonymousReactions.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
                  이 공간을 경험한 사람들의 기록
                </p>
                {anonymousReactions.map((r) => (
                  <div key={r.id} className="space-y-2">
                    {r.memo && (
                      <p className="text-sm leading-relaxed">&ldquo;{r.memo}&rdquo;</p>
                    )}
                    {r.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {r.tags.map((tag) => (
                          <span key={tag.id} className="text-xs px-2 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                            {TAG_LABELS[tag.tag]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {similarTasteCards.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>이 공간을 좋아한 취향들</p>
                {similarTasteCards.map((card) => (
                  <div key={card.userId} className="space-y-3 py-4 border-l pl-4" style={{ borderColor: "var(--border)" }}>
                    <p className="text-sm font-medium leading-snug">{card.phrase}</p>
                    {card.memo && (
                      <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>&ldquo;{card.memo}&rdquo;</p>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs" style={{ color: "var(--border)" }}>이 취향이 좋아한 다른 공간</p>
                      {card.otherSpaces.map((s) => (
                        <Link key={s.id} href={`/space/${s.slug}`} className="block text-sm hover:underline" style={{ color: "var(--dim)" }}>
                          · {s.name}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/taste/${card.userId}`}
                      className="inline-block text-xs py-1 px-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                      style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                    >
                      이 취향 따라가기 →
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}

          {(visitMessage || firstVisitPrompt) && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <section className="space-y-1.5">
                {visitMessage ? (
                  <>
                    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>다시 돌아왔네요</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{visitMessage}</p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--border)" }}>오늘의 느낌을 가볍게 남겨보세요.</p>
                )}
              </section>
            </>
          )}
        </div>

        <div className="px-6 pb-4 text-center">
          <Link href="/about" className="text-xs" style={{ color: "var(--border)" }}>
            공간큐브가 뭔가요? →
          </Link>
        </div>

        <div className="sticky bottom-0 px-6 pb-8 pt-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          {session ? (
            <Link
              href={`/space/${slug}/record`}
              className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
              style={{ borderColor: "var(--fg)" }}
            >
              {hasRecord ? "다시 기록하기" : "이 공간, 기록 남기기"}
            </Link>
          ) : (
            <Link
              href="/login"
              className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
              style={{ borderColor: "var(--fg)" }}
            >
              로그인하고 기록 남기기
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
