/* ── 공개 취향 프로필 데이터(서버 전용) ─────────────────────────────────────────
   새 저장소를 만들지 않는다: 공간 목록은 내 아카이브(getLibrary), 취향은 기존 발견 추천 신호(getUserDiscoveryContext →
   buildTasteProfile → topAttributes), 관계는 SavedTaste, 공간은 canonical EditorialSpace를 그대로 쓴다.
   공개 응답에는 메모 · 방문 날짜 · 비공개 공간을 아예 담지 않는다(화면에서 숨기는 게 아니라 조회 단계에서 제외). ── */

import { prisma } from "@/lib/prisma";
import { getLibrary } from "@/lib/archive/library";
import { getUserDiscoveryContext } from "@/lib/discoverySignals";
import { attrKey, buildTasteProfile } from "@/lib/discoveryRecommend";
import { getSpacesByIds } from "@/lib/editorial/queries";
import type { SpaceView } from "@/lib/editorial/types";
import { compareTaste, frequentAreas, publicSpaces, publicTasteWords, type PublicSpaceRow, type TasteComparison } from "./publicProfile";

const TASTE_WORDS = 4;
const PHOTOS_PER_SPACE = 4;

const PICK_INCLUDE = { space: { select: { slug: true, area: true, status: true, isDemo: true } } } as const;

/**
 * 공개 대표 취향 — 순위는 기존 취향 계산(아카이브의 "자주 나타나는 특징"과 같은 가중치) 그대로,
 * 단어는 공개한 공간의 유형·태그에서도 확인되는 것만(publicTasteWords). 비공개 공간에서만 나온 취향은 드러나지 않는다.
 */
export async function tasteWordsOf(userId: string, rows: PublicSpaceRow[]): Promise<string[]> {
  if (rows.length === 0) return [];
  const [ctx, spaces] = await Promise.all([
    getUserDiscoveryContext(userId, { includeDemo: false }),
    prisma.editorialSpace.findMany({ where: { id: { in: rows.map((r) => r.spaceId) } }, select: { category: true, tags: true } }),
  ]);
  const profile = buildTasteProfile(ctx.signals);
  const ranked = [...profile.weights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => ({ key, label: profile.labels.get(key) ?? key }));
  return publicTasteWords(ranked, spaces.flatMap((s) => [s.category, ...s.tags]), attrKey, TASTE_WORDS);
}

/** 설정 미리보기용 — 지금 공개 프로필에 보일 대표 취향. */
export async function previewTasteWords(userId: string): Promise<string[]> {
  return tasteWordsOf(userId, await publicSpaceRows(userId));
}

/** 이 사용자가 지금 공개 프로필에 보여주는 공간(아카이브에 남아 있는 것만). */
export async function publicSpaceRows(userId: string): Promise<PublicSpaceRow[]> {
  const [library, picks] = await Promise.all([
    getLibrary(userId, { includeDemo: false }),
    prisma.profileSpace.findMany({ where: { userId }, include: PICK_INCLUDE }),
  ]);
  return publicSpaces(library, picks);
}

export interface PublicSpaceCard {
  space: SpaceView;
  visited: boolean;
  /** showPhotos일 때만 채운다 */
  photos: string[];
}

export interface PublicProfile {
  userId: string;
  handle: string;
  name: string;
  image: string | null;
  bio: string | null;
  tasteWords: string[];
  areas: string[];
  visited: PublicSpaceCard[];
  wantToGo: PublicSpaceCard[];
  /** 내가 따라가는 취향 수(작게만 표시) — "나를 따라가는 사람" 수는 V1에서 보여주지 않는다 */
  followingCount: number;
  /** 공개된 큐레이터 프로필이 있으면 그 주소(큐레이터 = 같은 사용자의 추가 역할) */
  curatorSlug: string | null;
  isPublic: boolean;
}

/**
 * handle로 공개 프로필 조회. 비공개면 null — 단 본인은 비공개 상태로도 미리 볼 수 있다(selfPreview).
 * 시연 계정(isDemo)은 공개 화면에 나오지 않는다.
 */
export async function getPublicProfile(handle: string, viewerId: string | null, opts: { curators: boolean }): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { profileHandle: handle },
    select: {
      id: true, nickname: true, image: true, isDemo: true, profilePublic: true, profileHandle: true, profileBio: true,
      profileShowTaste: true, profileShowAreas: true,
      curatorProfile: { select: { slug: true, status: true, isDemo: true } },
      _count: { select: { savedTastes: true } },
    },
  });
  if (!user || user.isDemo) return null;
  if (!user.profilePublic && user.id !== viewerId) return null;

  const rows = await publicSpaceRows(user.id);
  const words = user.profileShowTaste ? await tasteWordsOf(user.id, rows) : [];
  const [views, photos] = await Promise.all([
    getSpacesByIds(rows.map((r) => r.spaceId)),
    prisma.archiveEntry.findMany({
      where: { userId: user.id, spaceId: { in: rows.filter((r) => r.showPhotos).map((r) => r.spaceId) } },
      select: { spaceId: true, photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], take: PHOTOS_PER_SPACE, select: { url: true } } },
    }),
  ]);
  const photoMap = new Map(photos.map((p) => [p.spaceId!, p.photos.map((x) => x.url)]));
  const cards = rows
    .map((r) => ({ r, view: views.get(r.spaceId) }))
    .filter((x): x is { r: PublicSpaceRow; view: SpaceView } => !!x.view)
    .map(({ r, view }) => ({ space: view, visited: r.visited, photos: r.showPhotos ? photoMap.get(r.spaceId) ?? [] : [] }));
  const cp = user.curatorProfile;

  return {
    userId: user.id,
    handle: user.profileHandle!,
    name: user.nickname || `@${user.profileHandle}`,
    image: user.image,
    bio: user.profileBio,
    tasteWords: words,
    areas: user.profileShowAreas ? frequentAreas(rows) : [],
    visited: cards.filter((c) => c.visited),
    wantToGo: cards.filter((c) => !c.visited),
    followingCount: user._count.savedTastes,
    curatorSlug: opts.curators && cp && cp.status === "PUBLISHED" && !cp.isDemo ? cp.slug : null,
    isPublic: user.profilePublic,
  };
}

/** 보는 사람 기준 정보 — 따라가는 중인지 · 내 취향과 비교(퍼센트 없이) · 내 저장 상태. */
export async function viewerContext(viewerId: string | null, p: PublicProfile): Promise<{ following: boolean; comparison: TasteComparison | null; savedIds: Set<string> }> {
  if (!viewerId || viewerId === p.userId) return { following: false, comparison: null, savedIds: await savedIdsOf(viewerId) };
  const [follow, ctx, library, savedIds] = await Promise.all([
    prisma.savedTaste.findUnique({ where: { userId_targetUserId: { userId: viewerId, targetUserId: p.userId } }, select: { id: true } }),
    getUserDiscoveryContext(viewerId, { includeDemo: false }),
    getLibrary(viewerId, { includeDemo: false }),
    savedIdsOf(viewerId),
  ]);
  const mySlugs = new Set(library.filter((i) => !i.personal).map((i) => i.key.slice(2)));
  const targetPublic = [...p.visited, ...p.wantToGo].map((c) => ({ spaceId: c.space.id, slug: c.space.slug }));
  const comparison = compareTaste(buildTasteProfile(ctx.signals).weights, p.tasteWords, mySlugs, targetPublic, attrKey);
  return { following: !!follow, comparison, savedIds };
}

async function savedIdsOf(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.savedEditorialSpace.findMany({ where: { userId }, select: { spaceId: true } });
  return new Set(rows.map((r) => r.spaceId));
}

export interface FollowedTaste {
  handle: string;
  name: string;
  image: string | null;
  tasteWords: string[];
  areas: string[];
  recent: SpaceView[];
}

/** 따라가는 취향 — 지금 공개 중인 프로필만(비공개로 바뀐 사람은 목록에서 빠지고 수만 알려준다). 피드가 아니라 사람 단위 목록. */
export async function getFollowedTastes(userId: string): Promise<{ items: FollowedTaste[]; hidden: number }> {
  const rows = await prisma.savedTaste.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
    select: { target: { select: { id: true, nickname: true, image: true, isDemo: true, profilePublic: true, profileHandle: true, profileShowTaste: true, profileShowAreas: true } } },
  });
  const visible = rows.map((r) => r.target).filter((t) => t.profilePublic && !!t.profileHandle && !t.isDemo);
  const items = await Promise.all(
    visible.map(async (t) => {
      const spaceRows = await publicSpaceRows(t.id);
      const words = t.profileShowTaste ? await tasteWordsOf(t.id, spaceRows) : [];
      const views = await getSpacesByIds(spaceRows.slice(0, 3).map((r) => r.spaceId));
      return {
        handle: t.profileHandle!, name: t.nickname || `@${t.profileHandle}`, image: t.image, tasteWords: words,
        areas: t.profileShowAreas ? frequentAreas(spaceRows) : [],
        recent: spaceRows.slice(0, 3).map((r) => views.get(r.spaceId)).filter((v): v is SpaceView => !!v),
      };
    }),
  );
  return { items, hidden: rows.length - visible.length };
}
