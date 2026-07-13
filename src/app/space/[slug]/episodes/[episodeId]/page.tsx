import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LOCALE_COOKIE_NAME, resolveInitialLocale, availableLocalesForSpace } from "@/lib/localeResolve";
import { resolveLocalizedField } from "@/lib/i18nContent";
import { DEFAULT_LOCALE, type LocaleCode } from "@/lib/locales";

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
    prisma.space.findUnique({
      where: { slug, isActive: true },
      select: { id: true, name: true, slug: true, multilingualEnabled: true, supportedLocales: true },
    }),
    auth(),
  ]);
  if (!space) notFound();

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { scenes: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
  });
  if (!episode || episode.spaceId !== space.id || !episode.published) notFound();

  // ── 다국어: 공간 페이지와 동일한 쿠키/헤더 기준으로 언어를 감지해 같은 언어 상태를 유지한다.
  let locale: LocaleCode = DEFAULT_LOCALE;
  let usedContentFallback = false;
  let localizedTitle = episode.title;
  let localizedSubtitle = episode.description;
  const localizedScenes = episode.scenes.map((s) => ({ id: s.id, title: s.title as string | null, content: s.content as string }));

  if (space.multilingualEnabled && space.supportedLocales.length > 0) {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
    locale = resolveInitialLocale({
      cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null,
      acceptLanguageHeader: headerList.get("accept-language"),
      spaceSupportedLocales: space.supportedLocales,
    });

    if (locale !== "ko") {
      const [epTranslations, sceneTranslations] = await Promise.all([
        prisma.episodeTranslation.findMany({ where: { episodeId: episode.id, locale: { in: [locale, "en"] } } }),
        prisma.sceneTranslation.findMany({ where: { sceneId: { in: episode.scenes.map((s) => s.id) }, locale: { in: [locale, "en"] } } }),
      ]);
      const epPrimary = epTranslations.find((t) => t.locale === locale);
      const epEnglish = epTranslations.find((t) => t.locale === "en");
      const titleResult = resolveLocalizedField(locale, episode.title, epPrimary?.title, epEnglish?.title);
      const subtitleResult = resolveLocalizedField(locale, episode.description, epPrimary?.subtitle, epEnglish?.subtitle);
      localizedTitle = titleResult.value ?? episode.title;
      localizedSubtitle = subtitleResult.value;

      let anySceneFallback = false;
      for (let i = 0; i < localizedScenes.length; i++) {
        const scene = episode.scenes[i];
        const primary = sceneTranslations.find((t) => t.sceneId === scene.id && t.locale === locale);
        const english = sceneTranslations.find((t) => t.sceneId === scene.id && t.locale === "en");
        const titleR = resolveLocalizedField(locale, scene.title, primary?.title, english?.title);
        const contentR = resolveLocalizedField(locale, scene.content, primary?.content, english?.content);
        localizedScenes[i] = { id: scene.id, title: titleR.value, content: contentR.value ?? scene.content };
        if (contentR.usedFallback) anySceneFallback = true;
      }

      usedContentFallback = titleResult.usedFallback || subtitleResult.usedFallback || anySceneFallback;
    }
  }

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
        <div className="flex items-center gap-2">
          {space.multilingualEnabled && space.supportedLocales.length > 0 && (
            <LanguageSwitcher currentLocale={locale} availableLocales={availableLocalesForSpace(space.supportedLocales)} />
          )}
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>EP.{episode.episodeNumber}</p>
        </div>
      </div>

      {usedContentFallback && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
          이 이야기는 아직 선택한 언어로 준비되지 않아 다른 언어로 보여드리고 있어요.
        </p>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{localizedTitle}</h1>
          {localizedSubtitle && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{localizedSubtitle}</p>
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

      <div className="flex flex-col">
        {(() => {
          let sceneNumber = 0;
          return episode.scenes.map((scene, i) => {
            const localized = localizedScenes[i];
            const hasContent = !!localized.content;
            if (hasContent) sceneNumber++;

            // 마지막 문단은 이 Scene의 핵심 문장으로 보고 별도로 강조한다.
            // 문단이 하나뿐이면(줄바꿈 두 번으로 나뉘지 않으면) 어색하게 쪼개지 않고 그대로 본문으로 둔다.
            const paragraphs = hasContent
              ? localized.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
              : [];
            const hasHighlight = paragraphs.length > 1;
            const bodyText = hasHighlight ? paragraphs.slice(0, -1).join("\n\n") : paragraphs.join("\n\n");
            const highlight = hasHighlight ? paragraphs[paragraphs.length - 1] : null;

            return (
              <div
                key={scene.id}
                className="py-12 first:pt-0"
                style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                {scene.imageUrl && (
                  <div className="relative w-full overflow-hidden mb-6" style={{ aspectRatio: scene.imageAspectRatio ?? "3/2" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={scene.imageUrl}
                      alt={localized.title ?? ""}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${(scene.imagePositionX ?? 0.5) * 100}% ${(scene.imagePositionY ?? 0.5) * 100}%`,
                        transform: `scale(${scene.imageZoom ?? 1})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                )}

                {hasContent && (
                  <div className="space-y-4 max-w-[36rem]">
                    <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--dim)" }}>
                      Scene {sceneNumber}
                    </p>
                    {localized.title && (
                      <h2 className="text-xl font-bold leading-snug">{localized.title}</h2>
                    )}
                    {bodyText && (
                      <p className="text-base leading-8 whitespace-pre-line">{bodyText}</p>
                    )}
                    {highlight && (
                      <p
                        className="text-lg font-semibold leading-relaxed pl-4 whitespace-pre-line"
                        style={{ borderLeft: "2px solid var(--fg)" }}
                      >
                        {highlight}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })()}
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
