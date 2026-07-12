import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { isTranslatableLocale } from "@/lib/locales";
import { computeSourceHash, translateFields } from "@/lib/translate";

export const dynamic = "force-dynamic";

/** 한 번의 요청으로 번역할 수 있는 최대 에피소드 수 — 예상치 못한 대량 API 호출 방지 */
const MAX_EPISODES_PER_REQUEST = 5;

interface Props { params: Promise<{ spaceId: string }> }

interface GenResult {
  scope: "space" | "episode" | "scene";
  targetId: string;
  targetLabel: string;
  locale: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    locales?: string[];
    scope?: "space" | "episodes";
    episodeIds?: string[];
    force?: boolean;
  };

  const scope = body.scope === "episodes" ? "episodes" : "space";
  const force = !!body.force;
  const requestedLocales = Array.isArray(body.locales) ? [...new Set(body.locales)] : [];

  if (requestedLocales.length === 0) {
    return NextResponse.json({ error: "번역할 언어를 선택해주세요." }, { status: 400 });
  }
  const invalidLocale = requestedLocales.filter((l) => !isTranslatableLocale(l));
  if (invalidLocale.length > 0) {
    return NextResponse.json({ error: `지원하지 않는 언어입니다: ${invalidLocale.join(", ")}` }, { status: 400 });
  }
  const notSupportedByThisSpace = requestedLocales.filter((l) => !space.supportedLocales.includes(l));
  if (notSupportedByThisSpace.length > 0) {
    return NextResponse.json({ error: `이 공간에서 지원하지 않는 언어입니다: ${notSupportedByThisSpace.join(", ")}` }, { status: 400 });
  }

  const results: GenResult[] = [];

  if (scope === "space") {
    const sourceFields = {
      tagline: space.tagline,
      description: space.description,
      ownerBio: space.ownerBio,
    };
    const sourceHash = computeSourceHash([sourceFields.tagline, sourceFields.description, sourceFields.ownerBio]);

    for (const locale of requestedLocales) {
      const existing = await prisma.spaceTranslation.findUnique({ where: { spaceId_locale: { spaceId, locale } } });

      if (!force && existing?.status === "READY" && existing.sourceHash === sourceHash) {
        results.push({ scope: "space", targetId: spaceId, targetLabel: "공간 소개", locale, ok: true, skipped: true });
        continue;
      }

      const translated = await translateFields(locale, sourceFields);

      if (!translated.ok) {
        if (!existing) {
          await prisma.spaceTranslation.create({
            data: { spaceId, locale, status: "ERROR", sourceHash, errorMessage: translated.error },
          });
        }
        // 이미 유효한 번역이 있었다면 실패 시에도 기존 값을 그대로 보존한다(덮어쓰지 않음).
        results.push({ scope: "space", targetId: spaceId, targetLabel: "공간 소개", locale, ok: false, error: translated.error });
        continue;
      }

      await prisma.spaceTranslation.upsert({
        where: { spaceId_locale: { spaceId, locale } },
        create: {
          spaceId,
          locale,
          status: "READY",
          sourceHash,
          tagline: translated.fields.tagline ?? null,
          description: translated.fields.description ?? null,
          ownerBio: translated.fields.ownerBio ?? null,
          errorMessage: null,
        },
        update: {
          status: "READY",
          sourceHash,
          tagline: translated.fields.tagline ?? null,
          description: translated.fields.description ?? null,
          ownerBio: translated.fields.ownerBio ?? null,
          errorMessage: null,
        },
      });
      results.push({ scope: "space", targetId: spaceId, targetLabel: "공간 소개", locale, ok: true });
    }
  } else {
    const episodeIds = Array.isArray(body.episodeIds) ? [...new Set(body.episodeIds)] : [];
    if (episodeIds.length === 0) {
      return NextResponse.json({ error: "번역할 에피소드를 선택해주세요." }, { status: 400 });
    }
    if (episodeIds.length > MAX_EPISODES_PER_REQUEST) {
      return NextResponse.json(
        { error: `한 번에 최대 ${MAX_EPISODES_PER_REQUEST}개 에피소드까지 번역할 수 있어요.` },
        { status: 400 },
      );
    }

    const episodes = await prisma.episode.findMany({
      where: { id: { in: episodeIds }, spaceId },
      include: { scenes: true },
    });
    if (episodes.length !== episodeIds.length) {
      return NextResponse.json({ error: "존재하지 않거나 이 공간에 속하지 않은 에피소드가 있어요." }, { status: 400 });
    }

    for (const episode of episodes) {
      const epSourceFields = { title: episode.title, subtitle: episode.description };
      const epHash = computeSourceHash([epSourceFields.title, epSourceFields.subtitle]);
      const episodeLabel = `EP.${episode.episodeNumber} ${episode.title}`;

      for (const locale of requestedLocales) {
        const existing = await prisma.episodeTranslation.findUnique({
          where: { episodeId_locale: { episodeId: episode.id, locale } },
        });

        if (!force && existing?.status === "READY" && existing.sourceHash === epHash) {
          results.push({ scope: "episode", targetId: episode.id, targetLabel: episodeLabel, locale, ok: true, skipped: true });
        } else {
          const translated = await translateFields(locale, epSourceFields);
          if (!translated.ok) {
            if (!existing) {
              await prisma.episodeTranslation.create({
                data: { episodeId: episode.id, locale, status: "ERROR", sourceHash: epHash, errorMessage: translated.error },
              });
            }
            results.push({ scope: "episode", targetId: episode.id, targetLabel: episodeLabel, locale, ok: false, error: translated.error });
          } else {
            await prisma.episodeTranslation.upsert({
              where: { episodeId_locale: { episodeId: episode.id, locale } },
              create: {
                episodeId: episode.id,
                locale,
                status: "READY",
                sourceHash: epHash,
                title: translated.fields.title ?? null,
                subtitle: translated.fields.subtitle ?? null,
                errorMessage: null,
              },
              update: {
                status: "READY",
                sourceHash: epHash,
                title: translated.fields.title ?? null,
                subtitle: translated.fields.subtitle ?? null,
                errorMessage: null,
              },
            });
            results.push({ scope: "episode", targetId: episode.id, targetLabel: episodeLabel, locale, ok: true });
          }
        }

        for (const scene of episode.scenes) {
          const sceneSourceFields = { title: scene.title, content: scene.content };
          const sceneHash = computeSourceHash([sceneSourceFields.title, sceneSourceFields.content]);
          const sceneLabel = scene.title ?? `${episodeLabel} Scene`;
          const existingScene = await prisma.sceneTranslation.findUnique({
            where: { sceneId_locale: { sceneId: scene.id, locale } },
          });

          if (!force && existingScene?.status === "READY" && existingScene.sourceHash === sceneHash) {
            results.push({ scope: "scene", targetId: scene.id, targetLabel: sceneLabel, locale, ok: true, skipped: true });
            continue;
          }

          const translatedScene = await translateFields(locale, sceneSourceFields);
          if (!translatedScene.ok) {
            if (!existingScene) {
              await prisma.sceneTranslation.create({
                data: { sceneId: scene.id, locale, status: "ERROR", sourceHash: sceneHash, errorMessage: translatedScene.error },
              });
            }
            results.push({ scope: "scene", targetId: scene.id, targetLabel: sceneLabel, locale, ok: false, error: translatedScene.error });
          } else {
            await prisma.sceneTranslation.upsert({
              where: { sceneId_locale: { sceneId: scene.id, locale } },
              create: {
                sceneId: scene.id,
                locale,
                status: "READY",
                sourceHash: sceneHash,
                title: translatedScene.fields.title ?? null,
                content: translatedScene.fields.content ?? null,
                errorMessage: null,
              },
              update: {
                status: "READY",
                sourceHash: sceneHash,
                title: translatedScene.fields.title ?? null,
                content: translatedScene.fields.content ?? null,
                errorMessage: null,
              },
            });
            results.push({ scope: "scene", targetId: scene.id, targetLabel: sceneLabel, locale, ok: true });
          }
        }
      }
    }
  }

  return NextResponse.json({ results });
}
