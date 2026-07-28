import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import type { Metadata } from "next";
import { resolveSpaceAccess, canBypassSpaceLock } from "@/lib/spaceUnlock";
import { isNewVisit } from "@/lib/visit";
import { computeEpisodeState } from "@/lib/episodeState";
import SpaceLockNotice from "@/components/SpaceLockNotice";
import OwnerStory from "./OwnerStory";
import ScanTracker from "@/components/ScanTracker";
import SpaceUnlockScreen from "./SpaceUnlockScreen";
import SaveSpaceButton from "@/components/SaveSpaceButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import EpisodeSection, { type BannerInfo } from "./EpisodeSection";
import { ENABLE_GUESTBOOK_WALL } from "@/lib/features";
import { aggregateSpaceTags, getSpaceUsageSummary } from "@/lib/spaceInsight";
import { LOCALE_COOKIE_NAME, resolveInitialLocale, availableLocalesForSpace } from "@/lib/localeResolve";
import { resolveLocalizedField } from "@/lib/i18nContent";
import { DEFAULT_LOCALE, type LocaleCode } from "@/lib/locales";
import { ENABLE_MULTILINGUAL } from "@/lib/pilotFlags";

interface Props {
  params: Promise<{ slug: string }>;
}

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

export default async function SpacePage({ params }: Props) {
  const { slug } = await params;

  const [space, session] = await Promise.all([
    prisma.space.findUnique({ where: { slug, isActive: true } }),
    auth(),
  ]);
  if (!space) notFound();

  // ── 다국어: 이 공간이 다국어를 켠 경우에만 언어를 감지하고 번역을 불러온다.
  // 꺼진 공간은 쿠키/헤더를 조회하지 않고 기존과 완전히 동일하게 한국어만 렌더링한다.
  let locale: LocaleCode = DEFAULT_LOCALE;
  let usedOwnerBioFallback = false;
  let localizedTagline = space.tagline;
  let localizedOwnerBio = space.ownerBio;

  if (ENABLE_MULTILINGUAL && space.multilingualEnabled && space.supportedLocales.length > 0) {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
    locale = resolveInitialLocale({
      cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null,
      acceptLanguageHeader: headerList.get("accept-language"),
      spaceSupportedLocales: space.supportedLocales,
    });

    if (locale !== "ko") {
      const rows = await prisma.spaceTranslation.findMany({
        where: { spaceId: space.id, locale: { in: [locale, "en"] } },
      });
      const primary = rows.find((r) => r.locale === locale);
      const english = rows.find((r) => r.locale === "en");

      const taglineResult = resolveLocalizedField(locale, space.tagline, primary?.tagline, english?.tagline);
      const ownerBioResult = resolveLocalizedField(locale, space.ownerBio, primary?.ownerBio, english?.ownerBio);
      localizedTagline = taglineResult.value;
      localizedOwnerBio = ownerBioResult.value;
      usedOwnerBioFallback = ownerBioResult.usedFallback && !!space.ownerBio;
    }
  }

  const [user, episodesRaw, anonymousReactions, allTagRecords] = await Promise.all([
    session?.user?.id ? prisma.user.findUnique({ where: { id: session.user.id } }) : Promise.resolve(null),
    prisma.episode.findMany({
      where: { spaceId: space.id, published: true },
      orderBy: { displayOrder: "asc" },
    }),
    // MVP 기간 비활성 기능 — 삭제하지 않고 그대로 보존 (플래그 true 시 즉시 복구)
    prisma.record.findMany({
      where: { spaceId: space.id, OR: [{ memo: { not: null } }, { tags: { some: {} } }] },
      include: { tags: true },
      orderBy: { visitedAt: "desc" },
      take: 5,
    }),
    prisma.record.findMany({ where: { spaceId: space.id }, include: { tags: true } }),
  ]);

  let visitCount = 0;
  let isFirstVisit = false;
  let isSaved = false;
  let unlocked = false;

  if (user) {
    const [records, saved] = await Promise.all([
      prisma.record.findMany({
        where: { userId: user.id, spaceId: space.id },
        orderBy: { visitedAt: "desc" },
        select: { visitedAt: true },
      }),
      prisma.savedSpace.findUnique({
        where: { userId_spaceId: { userId: user.id, spaceId: space.id } },
        select: { id: true },
      }),
    ]);
    visitCount = records.length;
    isSaved = !!saved;

    // "첫 방문" 배너 판정: 가장 최근 Record가 이번 방문(재방문 인정 간격 이내)에 만들어진
    // 것이면 그 Record를 뺀 "이전 방문 횟수"가 0일 때만 첫 방문으로 본다 — 취향 점수를
    // 아직 제출하지 않은 진짜 첫 방문(visitCount=0)과, 방금 제출해 visitCount가 1이 된
    // 경우를 동일하게 "첫 방문"으로 취급한다.
    const latestVisitedAt = records[0]?.visitedAt ?? null;
    const isThisVisitRecord = !!latestVisitedAt && !isNewVisit(latestVisitedAt);
    const priorVisitCount = isThisVisitRecord ? visitCount - 1 : visitCount;
    isFirstVisit = priorVisitCount === 0;

    const bypass = canBypassSpaceLock(session?.user?.email, space, user.id);
    unlocked = await resolveSpaceAccess({ userId: user.id, spaceId: space.id, isBypass: bypass });
  } else {
    // 비로그인 방문자 — 실제 QR 스캔(QR_ACCESS_COOKIE)만 있으면 로그인 없이도 이야기를 읽을 수 있다.
    // 로그인은 기록/방명록 작성 등 "쓰기"에서만 요구한다.
    unlocked = await resolveSpaceAccess({ userId: null, spaceId: space.id, isBypass: false });
  }

  // 에피소드 목록도 상세 페이지와 같은 언어로 보여준다.
  const episodeTranslations =
    locale !== "ko" && episodesRaw.length > 0
      ? await prisma.episodeTranslation.findMany({
          where: { episodeId: { in: episodesRaw.map((e) => e.id) }, locale: { in: [locale, "en"] } },
        })
      : [];

  const episodes = episodesRaw.map((ep) => {
    const primary = episodeTranslations.find((t) => t.episodeId === ep.id && t.locale === locale);
    const english = episodeTranslations.find((t) => t.episodeId === ep.id && t.locale === "en");
    return {
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      title: resolveLocalizedField(locale, ep.title, primary?.title, english?.title).value ?? ep.title,
      unlockVisitCount: ep.unlockVisitCount,
      state: computeEpisodeState(ep.unlockVisitCount, visitCount),
    };
  });

  const newlyUnlocked = episodes.filter((e) => e.state === "NEWLY_UNLOCKED");
  const locked = episodes.filter((e) => e.state === "LOCKED");

  // 상단 안내 문구: 첫 방문 → 이번 방문으로 새 Episode 해제 → 잠긴 Episode 존재 → 모든 Episode 해제
  let banner: BannerInfo = null;
  if (isFirstVisit) {
    banner = { type: "first" };
  } else if (newlyUnlocked.length > 0) {
    banner = { type: "new", count: newlyUnlocked.length };
  } else if (locked.length > 0) {
    banner = { type: "locked", count: locked.length };
  } else if (episodes.length > 0) {
    banner = { type: "allUnlocked" };
  }

  // 아직 관리자가 만들지 않은 다음 이야기를 "예정" 카드로 예고 — 재방문 동기 부여용.
  // 배너 집계(locked 등)에는 영향을 주지 않도록 화면 표시용 배열에만 덧붙인다.
  const episodesForDisplay =
    episodes.length > 0
      ? [
          ...episodes,
          {
            id: "__upcoming__",
            episodeNumber: episodes[episodes.length - 1].episodeNumber + 1,
            title: "",
            unlockVisitCount: 0,
            state: "LOCKED" as const,
            isPlaceholder: true as const,
          },
        ]
      : episodes;

  const spaceTopTags = aggregateSpaceTags(allTagRecords);
  const usageSummary = getSpaceUsageSummary(spaceTopTags);
  const SHOW_REACTION_BOARD = false;

  const recordHref = `/space/${slug}/record`;
  const ctaHref = session ? recordHref : `/login?callbackUrl=${encodeURIComponent(recordHref)}`;
  const hasOwnerNote = !!localizedOwnerBio;

  return (
    <main className="flex flex-col min-h-screen md:flex-row">
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
            style={{
              aspectRatio: "unset",
              objectPosition: `${(space.imagePositionX ?? 0.5) * 100}% ${(space.imagePositionY ?? 0.5) * 100}%`,
              transform: `scale(${space.imageZoom ?? 1})`,
              transformOrigin: "center center",
            }}
          />
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
            <div className="flex items-center gap-2">
              {ENABLE_MULTILINGUAL && space.multilingualEnabled && space.supportedLocales.length > 0 && (
                <LanguageSwitcher currentLocale={locale} availableLocales={availableLocalesForSpace(space.supportedLocales)} />
              )}
              <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold leading-tight">{space.name}</h1>
              <SaveSpaceButton spaceId={space.id} initialSaved={isSaved} isLoggedIn={!!session} />
            </div>
            {localizedTagline && (
              <p className="text-sm leading-relaxed italic" style={{ color: "var(--dim)" }}>{localizedTagline}</p>
            )}
          </div>

          {episodes.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              {unlocked ? (
                <EpisodeSection spaceSlug={space.slug} episodes={episodesForDisplay} banner={banner} />
              ) : (
                // 잠긴 상태에서는 Episode 제목/진행도 등 상세 이야기를 전혀 내려보내지 않는다 —
                // "이야기가 있다"는 사실과 안내만 보여준다. 여기 도달했다는 건 QR을 스캔한 적이
                // 없다는 뜻이다(스캔했다면 로그인 여부와 무관하게 위에서 이미 unlocked=true).
                <SpaceLockNotice naverMapUrl={space.naverMapUrl} />
              )}
            </>
          )}

          {unlocked && hasOwnerNote && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <section className="space-y-3">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영자 한마디</p>
                {usedOwnerBioFallback && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
                    이 한마디는 아직 선택한 언어로 준비되지 않아 다른 언어로 보여드리고 있어요.
                  </p>
                )}
                <OwnerStory
                  ownerName={space.ownerName}
                  ownerPhotoUrl={space.ownerPhotoUrl}
                  ownerBio={localizedOwnerBio}
                />
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
        </div>

        <div className="px-6 pb-4 text-center">
          <Link href="/about" className="text-xs" style={{ color: "var(--border)" }}>
            공간큐브가 뭔가요? →
          </Link>
        </div>

        <div
          className="sticky bottom-0 px-6 pt-4"
          style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        >
          <Link
            href={ctaHref}
            className="tap-target flex items-center justify-center w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            방명록 열기
          </Link>
        </div>
      </div>
    </main>
  );
}
