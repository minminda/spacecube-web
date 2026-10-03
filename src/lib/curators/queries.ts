/* ── 큐레이터 프로토타입 조회(서버 전용) ─────────────────────────────────────
   큐레이터 = CuratorProfile을 가진 User(별도 계정 유형 아님).
   가상 큐레이터·컬렉션·공간(isDemo)을 읽는 유일한 모듈. 모든 함수가 CuratorAccess를 받아
   includeDemo(관리자·로컬 미리보기)일 때만 가상 데이터를 포함한다. 공개는 발행(PUBLISHED)만.
   공간은 canonical EditorialSpace를 그대로 쓴다(큐레이터별 복제 없음). ── */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toSpaceView } from "@/lib/editorial/queries";
import type { ResolvedImage, SpaceView } from "@/lib/editorial/types";
import type { CuratorAccess } from "./access";
import type { FinderPick } from "./finder";

export interface CuratorSummary {
  id: string;
  /** 프로필 주인(User) — 큐레이터도 일반 사용자다 */
  userId: string;
  slug: string;
  name: string;
  bio: string;
  imageUrl: string | null;
  tasteTags: string[];
  instagramHandle: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  isOfficial: boolean;
  isDemo: boolean;
  collectionCount: number;
  spaceCount: number;
}

export interface CollectionPick {
  space: SpaceView;
  comment: string | null;
}

export interface CollectionView {
  id: string;
  slug: string;
  title: string;
  description: string;
  area: string | null;
  keywords: string[];
  cover: ResolvedImage;
  isDemo: boolean;
  curator: { slug: string; name: string; isOfficial: boolean };
  picks: CollectionPick[];
}

function demoFilter(access: CuratorAccess) {
  return access.includeDemo ? {} : { isDemo: false };
}

function curatorWhere(access: CuratorAccess): Prisma.CuratorProfileWhereInput {
  return { status: "PUBLISHED", ...demoFilter(access) };
}

function collectionWhere(access: CuratorAccess): Prisma.CuratorCollectionWhereInput {
  return { status: "PUBLISHED", ...demoFilter(access), curator: curatorWhere(access) };
}

function spaceWhere(access: CuratorAccess): Prisma.EditorialSpaceWhereInput {
  return { status: "PUBLISHED", ...demoFilter(access) };
}

const pickInclude = (access: CuratorAccess) => ({
  where: { space: spaceWhere(access) },
  orderBy: { displayOrder: "asc" as const },
  include: { space: true },
});

type CollectionRow = Prisma.CuratorCollectionGetPayload<{ include: { curator: true; spaces: { include: { space: true } } } }>;

function toCollectionView(row: CollectionRow): CollectionView {
  const picks = row.spaces.map((p) => ({ space: toSpaceView(p.space), comment: p.comment }));
  const firstCover = picks.find((p) => p.space.coverImage)?.space;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    area: row.area,
    keywords: row.keywords,
    cover: { src: row.coverImage ?? firstCover?.coverImage ?? null, alt: row.title, position: row.coverImage ? undefined : firstCover?.coverPosition },
    isDemo: row.isDemo,
    curator: { slug: row.curator.slug, name: row.curator.name, isOfficial: row.curator.isOfficial },
    picks,
  };
}

export async function listCurators(access: CuratorAccess): Promise<CuratorSummary[]> {
  const rows = await prisma.curatorProfile.findMany({
    where: curatorWhere(access),
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: { collections: { where: collectionWhere(access), include: { spaces: { where: { space: spaceWhere(access) }, select: { spaceId: true } } } } },
  });
  return rows.map((c) => ({
    id: c.id, userId: c.userId, slug: c.slug, name: c.name, bio: c.bio, imageUrl: c.imageUrl, tasteTags: c.tasteTags,
    instagramHandle: c.instagramHandle, instagramUrl: c.instagramUrl, websiteUrl: c.websiteUrl,
    isOfficial: c.isOfficial, isDemo: c.isDemo,
    collectionCount: c.collections.length,
    spaceCount: new Set(c.collections.flatMap((col) => col.spaces.map((s) => s.spaceId))).size,
  }));
}

export async function getCuratorBySlug(slug: string, access: CuratorAccess) {
  const row = await prisma.curatorProfile.findFirst({
    where: { slug, ...curatorWhere(access) },
    include: {
      collections: {
        where: collectionWhere(access),
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        include: { curator: true, spaces: pickInclude(access) },
      },
    },
  });
  if (!row) return null;
  const collections = row.collections.map(toCollectionView);
  return {
    curator: {
      id: row.id, userId: row.userId, slug: row.slug, name: row.name, bio: row.bio, imageUrl: row.imageUrl, tasteTags: row.tasteTags,
      instagramHandle: row.instagramHandle, instagramUrl: row.instagramUrl, websiteUrl: row.websiteUrl,
      isOfficial: row.isOfficial, isDemo: row.isDemo,
      collectionCount: collections.length,
      spaceCount: new Set(collections.flatMap((c) => c.picks.map((p) => p.space.id))).size,
    } satisfies CuratorSummary,
    collections,
  };
}

export async function getCollectionBySlug(slug: string, access: CuratorAccess): Promise<CollectionView | null> {
  const row = await prisma.curatorCollection.findFirst({
    where: { slug, ...collectionWhere(access) },
    include: { curator: true, spaces: pickInclude(access) },
  });
  return row ? toCollectionView(row) : null;
}

/** 같은 큐레이터의 다른 컬렉션 + 이 컬렉션 공간을 함께 고른 다른 큐레이터의 컬렉션. */
export async function getRelatedCollections(c: CollectionView, access: CuratorAccess): Promise<CollectionView[]> {
  const spaceIds = c.picks.map((p) => p.space.id);
  const rows = await prisma.curatorCollection.findMany({
    where: {
      ...collectionWhere(access),
      id: { not: c.id },
      OR: [{ curator: { slug: c.curator.slug } }, { spaces: { some: { spaceId: { in: spaceIds } } } }],
    },
    orderBy: [{ displayOrder: "asc" }],
    include: { curator: true, spaces: pickInclude(access) },
    take: 6,
  });
  return rows.map(toCollectionView);
}

/** 찾기·취향 겹침 계산용 — 발행된 컬렉션의 모든 (공간 × 컬렉션) 관계와 그 공간들. */
export async function getCuratedUniverse(access: CuratorAccess): Promise<{ picks: (FinderPick & { curatorIsOfficial: boolean })[]; spaces: Map<string, SpaceView> }> {
  const rows = await prisma.curatorCollectionSpace.findMany({
    where: { collection: collectionWhere(access), space: spaceWhere(access) },
    orderBy: [{ collection: { displayOrder: "asc" } }, { displayOrder: "asc" }],
    include: { space: true, collection: { include: { curator: true } } },
  });
  const spaces = new Map<string, SpaceView>();
  const picks = rows.map((r) => {
    if (!spaces.has(r.spaceId)) spaces.set(r.spaceId, toSpaceView(r.space));
    return {
      spaceId: r.spaceId,
      curatorSlug: r.collection.curator.slug,
      curatorName: r.collection.curator.name,
      curatorIsOfficial: r.collection.curator.isOfficial,
      collectionSlug: r.collection.slug,
      collectionTitle: r.collection.title,
      keywords: r.collection.keywords,
      comment: r.comment,
    };
  });
  return { picks, spaces };
}

/** 공간 상세의 "이 공간을 고른 큐레이터". */
export async function getPicksForSpace(spaceId: string, access: CuratorAccess) {
  const rows = await prisma.curatorCollectionSpace.findMany({
    where: { spaceId, collection: collectionWhere(access) },
    include: { collection: { include: { curator: true } } },
    orderBy: { collection: { displayOrder: "asc" } },
  });
  return rows.map((r) => ({
    curator: { slug: r.collection.curator.slug, name: r.collection.curator.name, isOfficial: r.collection.curator.isOfficial },
    collection: { slug: r.collection.slug, title: r.collection.title },
    comment: r.comment,
  }));
}
