/* ── Editorial CMS 공개 조회(서버 전용) ─────────────────────────────────────
   홈페이지 공개 페이지는 반드시 이 모듈로만 콘텐츠를 읽는다. 기본은 PUBLISHED만 반환하고,
   { preview: true }(관리자 미리보기)일 때만 초안·보관 콘텐츠도 포함한다. 발행된 큐레이션에
   연결된 공간이라도 공간 자체가 발행 상태가 아니면 공개 화면에서는 빠진다.
   Cube 운영 모델(Space/Episode/...)은 조회하지 않는다. ── */

import type { EditorialCuration, EditorialPerson, EditorialSpace, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readStoredBlocks, readStoredFeed, collectBlockSpaceIds } from "./input";
import type { CurationView, LinkedSpace, PersonView, ResolvedImage, SpaceView, EditorialBlock } from "./types";

export interface Visibility {
  preview?: boolean;
}

function statusFilter(v?: Visibility): Prisma.EditorialSpaceWhereInput {
  return v?.preview ? {} : { status: "PUBLISHED" };
}

export function toSpaceView(row: EditorialSpace): SpaceView {
  const description = row.description
    ? row.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : undefined;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    area: row.area,
    category: row.category,
    summary: row.summary ?? undefined,
    description,
    coverImage: row.coverImage ?? undefined,
    coverPosition: row.coverPosition ?? undefined,
    images: row.images,
    tags: row.tags,
    address: row.address ?? undefined,
    hours: row.openingHours ?? undefined,
    mapUrl: row.mapUrl ?? undefined,
    instagram: row.instagram ?? undefined,
    website: row.website ?? undefined,
    cubeAvailable: row.cubeAvailable,
    status: row.status,
  };
}

function cover(url: string | null, position: string | null, alt: string): ResolvedImage {
  return { src: url, alt, position: position ?? undefined };
}

/* ── 공간 콘텐츠 ── */

export async function listSpaces(v?: Visibility): Promise<SpaceView[]> {
  const rows = await prisma.editorialSpace.findMany({ where: statusFilter(v), orderBy: [{ createdAt: "asc" }] });
  return rows.map(toSpaceView);
}

export async function getSpaceBySlug(slug: string, v?: Visibility): Promise<SpaceView | null> {
  const row = await prisma.editorialSpace.findUnique({ where: { slug } });
  if (!row) return null;
  if (!v?.preview && row.status !== "PUBLISHED") return null;
  return toSpaceView(row);
}

/** id 목록 → 공간 Map(보이지 않는 공간은 빠짐). */
export async function getSpacesByIds(ids: string[], v?: Visibility): Promise<Map<string, SpaceView>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const rows = await prisma.editorialSpace.findMany({ where: { id: { in: unique }, ...statusFilter(v) } });
  return new Map(rows.map((r) => [r.id, toSpaceView(r)]));
}

/** ids 순서를 유지한 배열. */
export async function getSpacesInOrder(ids: string[], v?: Visibility): Promise<SpaceView[]> {
  const map = await getSpacesByIds(ids, v);
  return ids.flatMap((id) => map.get(id) ?? []);
}

/* ── 큐레이션 / 피플 ── */

const linkInclude = { orderBy: { order: "asc" as const }, include: { space: true } };

type LinkRow = { note: string | null; space: EditorialSpace };

function linked(rows: LinkRow[], v?: Visibility): LinkedSpace[] {
  return rows
    .filter((l) => v?.preview || l.space.status === "PUBLISHED")
    .map((l) => ({ space: toSpaceView(l.space), note: l.note ?? undefined }));
}

function toCurationView(row: EditorialCuration & { spaces: LinkRow[] }, v?: Visibility): CurationView {
  return {
    id: row.id,
    slug: row.slug,
    number: row.number,
    area: row.area ?? undefined,
    title: row.title,
    summary: row.summary,
    cover: cover(row.coverImage, row.coverPosition, row.area ? `${row.area} — ${row.title}` : row.title),
    spaces: linked(row.spaces, v),
    blocks: readStoredBlocks(row.blocks),
    status: row.status,
    publishedAt: row.publishedAt,
  };
}

function toPersonView(row: EditorialPerson & { spaces: LinkRow[] }, v?: Visibility): PersonView {
  return {
    id: row.id,
    slug: row.slug,
    number: row.number,
    title: row.title,
    subject: row.subject ?? undefined,
    summary: row.summary,
    cover: cover(row.coverImage, row.coverPosition, row.title),
    spaces: linked(row.spaces, v),
    blocks: readStoredBlocks(row.blocks),
    status: row.status,
    publishedAt: row.publishedAt,
  };
}

export async function listCurations(v?: Visibility): Promise<CurationView[]> {
  const rows = await prisma.editorialCuration.findMany({
    where: v?.preview ? {} : { status: "PUBLISHED" },
    orderBy: { number: "desc" },
    include: { spaces: linkInclude },
  });
  return rows.map((r) => toCurationView(r, v));
}

export async function getCurationBySlug(slug: string, v?: Visibility): Promise<CurationView | null> {
  const row = await prisma.editorialCuration.findUnique({ where: { slug }, include: { spaces: linkInclude } });
  if (!row || (!v?.preview && row.status !== "PUBLISHED")) return null;
  return toCurationView(row, v);
}

export async function listPeople(v?: Visibility): Promise<PersonView[]> {
  const rows = await prisma.editorialPerson.findMany({
    where: v?.preview ? {} : { status: "PUBLISHED" },
    orderBy: { number: "desc" },
    include: { spaces: linkInclude },
  });
  return rows.map((r) => toPersonView(r, v));
}

export async function getPersonBySlug(slug: string, v?: Visibility): Promise<PersonView | null> {
  const row = await prisma.editorialPerson.findUnique({ where: { slug }, include: { spaces: linkInclude } });
  if (!row || (!v?.preview && row.status !== "PUBLISHED")) return null;
  return toPersonView(row, v);
}

/** 본문 SPACE_CARD 블록이 가리키는 공간 Map(공개 규칙 동일). */
export async function getBlockSpaces(blocks: EditorialBlock[], v?: Visibility): Promise<Map<string, SpaceView>> {
  return getSpacesByIds(collectBlockSpaceIds(blocks), v);
}

/** 이 공간이 연결된 발행 큐레이션·피플(공간 상세의 "이 공간이 소개된 이야기"). */
export async function getStoriesForSpace(spaceId: string) {
  const [curations, people] = await Promise.all([
    prisma.editorialCuration.findMany({
      where: { status: "PUBLISHED", spaces: { some: { spaceId } } },
      orderBy: { number: "desc" },
      include: { spaces: linkInclude },
    }),
    prisma.editorialPerson.findMany({
      where: { status: "PUBLISHED", spaces: { some: { spaceId } } },
      orderBy: { number: "desc" },
      include: { spaces: linkInclude },
    }),
  ]);
  return { curations: curations.map((c) => toCurationView(c)), people: people.map((p) => toPersonView(p)) };
}

/* ── 홈 ── */

export type HomeFeedEntry =
  | { kind: "curation"; curation: CurationView }
  | { kind: "person"; person: PersonView }
  | { kind: "space"; space: SpaceView; headline?: string };

export interface HomeData {
  hero: SpaceView | null;
  featuredCuration: CurationView | null;
  featuredSpaces: SpaceView[];
  feed: HomeFeedEntry[];
}

/** 홈 노출 데이터 — 설정에 지정돼 있어도 발행 상태가 아닌 콘텐츠는 빠진다. */
export async function getHomeData(): Promise<HomeData> {
  const settings = await prisma.editorialHomeSettings.findUnique({ where: { id: "home" } });
  if (!settings) return { hero: null, featuredCuration: null, featuredSpaces: [], feed: [] };

  const feedItems = readStoredFeed(settings.feed);
  const spaceIds = [
    settings.heroSpaceId ?? "",
    ...settings.featuredSpaceIds,
    ...feedItems.flatMap((f) => (f.kind === "space" ? [f.id] : [])),
  ];
  const curationIds = [settings.featuredCurationId ?? "", ...feedItems.flatMap((f) => (f.kind === "curation" ? [f.id] : []))].filter(Boolean);
  const personIds = feedItems.flatMap((f) => (f.kind === "person" ? [f.id] : []));

  const [spaces, curations, people] = await Promise.all([
    getSpacesByIds(spaceIds),
    prisma.editorialCuration.findMany({ where: { id: { in: curationIds }, status: "PUBLISHED" }, include: { spaces: linkInclude } }),
    prisma.editorialPerson.findMany({ where: { id: { in: personIds }, status: "PUBLISHED" }, include: { spaces: linkInclude } }),
  ]);
  const curationMap = new Map(curations.map((c) => [c.id, toCurationView(c)]));
  const personMap = new Map(people.map((p) => [p.id, toPersonView(p)]));

  const feed: HomeFeedEntry[] = feedItems.flatMap((f): HomeFeedEntry[] => {
    if (f.kind === "curation") { const c = curationMap.get(f.id); return c ? [{ kind: "curation", curation: c }] : []; }
    if (f.kind === "person") { const p = personMap.get(f.id); return p ? [{ kind: "person", person: p }] : []; }
    const s = spaces.get(f.id);
    return s ? [{ kind: "space", space: s, headline: f.headline }] : [];
  });

  return {
    hero: settings.heroSpaceId ? spaces.get(settings.heroSpaceId) ?? null : null,
    featuredCuration: settings.featuredCurationId ? curationMap.get(settings.featuredCurationId) ?? null : null,
    featuredSpaces: settings.featuredSpaceIds.flatMap((id) => spaces.get(id) ?? []),
    feed,
  };
}
