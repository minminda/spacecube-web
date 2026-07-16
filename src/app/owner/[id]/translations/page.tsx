import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { ENABLE_MULTILINGUAL } from "@/lib/pilotFlags";
import { computeSourceHash } from "@/lib/translate";
import TranslationManager, { type EpisodeView, type SpaceTranslationView } from "./TranslationManager";

interface Props { params: Promise<{ id: string }> }

type EffectiveStatus = "NOT_CREATED" | "READY" | "OUTDATED" | "ERROR";

function effectiveStatus(
  row: { status: string; sourceHash: string | null; errorMessage?: string | null } | undefined,
  currentHash: string,
): EffectiveStatus {
  if (!row) return "NOT_CREATED";
  if (row.status === "ERROR") return "ERROR";
  if (row.sourceHash !== currentHash) return "OUTDATED";
  return row.status === "OUTDATED" ? "OUTDATED" : "READY";
}

export default async function SpaceTranslationsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  // 파일럿 기간 다국어 비활성 — 번역 관리 화면 자체를 막고 관리자 목록으로 돌려보낸다.
  if (!ENABLE_MULTILINGUAL) redirect("/owner");

  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) notFound();

  const [spaceTranslations, episodes] = await Promise.all([
    prisma.spaceTranslation.findMany({ where: { spaceId } }),
    prisma.episode.findMany({
      where: { spaceId },
      orderBy: { displayOrder: "asc" },
      include: {
        scenes: { orderBy: { displayOrder: "asc" }, include: { translations: true } },
        translations: true,
      },
    }),
  ]);

  const spaceSourceHash = computeSourceHash([space.tagline, space.description, space.ownerBio]);
  const spaceTranslationViews: SpaceTranslationView[] = spaceTranslations.map((t) => ({
    locale: t.locale,
    status: effectiveStatus(t, spaceSourceHash),
    tagline: t.tagline,
    description: t.description,
    ownerBio: t.ownerBio,
    errorMessage: t.errorMessage,
  }));

  const episodeViews: EpisodeView[] = episodes.map((ep) => {
    const epHash = computeSourceHash([ep.title, ep.description]);
    const epTransByLocale = new Map(ep.translations.map((t) => [t.locale, t]));

    return {
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      translations: Object.fromEntries(
        [...epTransByLocale.entries()].map(([locale, t]) => [
          locale,
          { status: effectiveStatus(t, epHash), title: t.title, subtitle: t.subtitle, errorMessage: t.errorMessage },
        ]),
      ),
      scenes: ep.scenes.map((scene) => {
        const sceneHash = computeSourceHash([scene.title, scene.content]);
        const sceneTransByLocale = new Map(scene.translations.map((t) => [t.locale, t]));
        return {
          id: scene.id,
          title: scene.title,
          translations: Object.fromEntries(
            [...sceneTransByLocale.entries()].map(([locale, t]) => [
              locale,
              { status: effectiveStatus(t, sceneHash), title: t.title, content: t.content, errorMessage: t.errorMessage },
            ]),
          ),
        };
      }),
    };
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / 다국어</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>다국어 공간 페이지</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      <TranslationManager
        spaceId={space.id}
        multilingualEnabled={space.multilingualEnabled}
        supportedLocales={space.supportedLocales}
        spaceTranslations={spaceTranslationViews}
        episodes={episodeViews}
      />
    </main>
  );
}
