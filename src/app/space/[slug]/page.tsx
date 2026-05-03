import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getLang } from "@/lib/i18n";
import { getTagLabels } from "@/lib/tags";
import type { Metadata } from "next";
import { type StoryItem } from "./SpaceStory";
import StoryTabs from "./StoryTabs";
import ScanTracker from "@/components/ScanTracker";
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
    twitter:   { card: "summary_large_image", title: space.name, description, images: space.imageUrl ? [space.imageUrl] : [] },
  };
}

export default async function SpacePage({ params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true } });
  if (!space) notFound();

  const session = await auth();
  const lang = await getLang();
  const TAG_LABELS = getTagLabels(lang);

  let hasRecord = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const record = await prisma.record.findFirst({ where: { userId: user.id, spaceId: space.id } });
      hasRecord = !!record;
    }
  }

  // 익명 반응: memo 있는 기록 (사용자 식별 없이 memo + tags만)
  const anonymousReactions = await prisma.record.findMany({
    where: { spaceId: space.id, memo: { not: null } },
    include: { tags: true },
    orderBy: { visitedAt: "desc" },
    take: 5,
  });

  // 공간 사용 방식 요약 (전체 기록 태그 집계)
  const allTagRecords = await prisma.record.findMany({
    where: { spaceId: space.id },
    include: { tags: true },
  });
  const topTags = aggregateSpaceTags(allTagRecords);
  const usageSummary = getSpaceUsageSummary(topTags, lang);

  const t = {
    location:     lang === "ko" ? "위치"                       : lang === "ja" ? "場所"           : lang === "zh" ? "位置"      : "Location",
    hours:        lang === "ko" ? "운영"                       : lang === "ja" ? "営業時間"        : lang === "zh" ? "营业时间"  : "Hours",
    moments:      lang === "ko" ? "이 공간을 경험한 사람들의 순간" : lang === "ja" ? "この空間を体験した人たちの瞬間" : lang === "zh" ? "体验过这个空间的人们的瞬间" : "Moments from This Space",
    editRecord:   lang === "ko" ? "다시 기록하기"                : lang === "ja" ? "また記録する"   : lang === "zh" ? "再次记录"  : "Record Again",
    leaveRecord:  lang === "ko" ? "이 공간, 기록 남기기"          : lang === "ja" ? "この空間を記録する" : lang === "zh" ? "记录这个空间" : "Leave a Record",
    signInRecord: lang === "ko" ? "로그인하고 기록 남기기"         : lang === "ja" ? "ログインして記録する" : lang === "zh" ? "登录后记录" : "Sign In to Leave a Record",
    home:         lang === "ko" ? "홈"                         : lang === "ja" ? "ホーム"          : lang === "zh" ? "首页"     : "Home",
  };

  return (
    <main className="flex flex-col min-h-screen md:flex-row">
      {/* 이미지 — 모바일: 상단 전체, 데스크탑: 왼쪽 sticky 패널 */}
      {space.imageUrl && (
        <div
          className="relative w-full flex-shrink-0 md:w-1/2 md:sticky md:top-0 md:self-start md:h-screen"
          style={{ aspectRatio: "16 / 11" }}
        >
          <Image
            src={space.imageUrl}
            alt={space.name}
            fill
            className="object-cover"
            style={{ aspectRatio: "unset" }}
          />
        </div>
      )}

      {/* QR 스캔 추적 (클라이언트, ?src=qr 감지) */}
      <Suspense fallback={null}>
        <ScanTracker spaceId={space.id} />
      </Suspense>

      {/* 오른쪽 콘텐츠 패널 */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex flex-col gap-6 px-6 py-6 flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
            <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← {t.home}</Link>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold leading-tight">{space.name}</h1>
            {space.tagline && (
              <p className="text-sm leading-relaxed italic" style={{ color: "var(--dim)" }}>{space.tagline}</p>
            )}
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm" style={{ color: "var(--dim)" }}>
            {space.naverMapUrl ? (
              <a href={space.naverMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:underline">
                <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">{t.location}</span>
                <span>{space.location} ↗</span>
              </a>
            ) : (
              <div className="flex items-start gap-3">
                <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">{t.location}</span>
                <span>{space.location}</span>
              </div>
            )}
            {space.openingHours && (
              <div className="flex items-start gap-3">
                <span className="text-xs uppercase tracking-widest flex-shrink-0 mt-0.5">{t.hours}</span>
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
            lang={lang}
          />

          {/* 공간 사용 방식 요약 */}
          {usageSummary && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <p
                className="text-sm leading-relaxed pl-3"
                style={{ borderLeft: "2px solid var(--border)", color: "var(--dim)" }}
              >
                {usageSummary}
              </p>
            </>
          )}

          {/* 익명 반응 — 리뷰가 아닌 "순간의 기록" */}
          {anonymousReactions.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.moments}</p>
                {anonymousReactions.map((r) => (
                  <div key={r.id} className="space-y-2">
                    <p className="text-sm leading-relaxed">&ldquo;{r.memo}&rdquo;</p>
                    {r.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {r.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="text-xs px-2 py-0.5 border"
                            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                          >
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
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-0 px-6 pb-8 pt-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          {session ? (
            <Link
              href={`/space/${slug}/record`}
              className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
              style={{ borderColor: "var(--fg)" }}
            >
              {hasRecord ? t.editRecord : t.leaveRecord}
            </Link>
          ) : (
            <Link
              href="/login"
              className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
              style={{ borderColor: "var(--fg)" }}
            >
              {t.signInRecord}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
