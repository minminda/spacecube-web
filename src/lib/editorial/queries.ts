/* ── Editorial CMS 공개 조회(서버 전용) ─────────────────────────────────────
   홈페이지 공개 페이지는 반드시 이 모듈로만 콘텐츠를 읽는다. 기본은 PUBLISHED만 반환하고,
   { preview: true }(관리자 미리보기)일 때만 초안·보관 콘텐츠도 포함한다. 발행된 큐레이션에
   연결된 공간이라도 공간 자체가 발행 상태가 아니면 공개 화면에서는 빠진다.
   Cube 운영 모델(Space/Episode/...)은 조회하지 않는다. ── */

import type { EditorialCuration, EditorialPerson, EditorialSpace, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readStoredBlocks, collectBlockSpaceIds } from "./input";
import type { ContentItem, CurationView, LinkedSpace, PersonView, ResolvedImage, SpaceView, EditorialBlock } from "./types";
import { curationLabel, formatEditorialDate, formatPeopleNumber, spaceCoverImage, spaceHref } from "./types";

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

/* ── HOME 콘텐츠 스트림 ─────────────────────────────────────────────────
   CURATION / PEOPLE / SPACE를 하나의 목록으로 합쳐 publishedAt DESC로 정렬한다. HOME은 이 규칙으로만
   자동 구성된다(발행하면 곧바로 LATEST·FEED에 반영, 별도 홈 편집 없음).
   - 기본: PUBLISHED만.
   - { preview: true }: 초안까지 포함(관리자 미리보기·로컬 개발 전용 — 호출부가 판단). 보관은 항상 제외.
     초안은 publishedAt이 없으므로 updatedAt으로 정렬한다. ── */

export async function listContentStream(v?: Visibility): Promise<ContentItem[]> {
  const where = v?.preview ? { status: { in: ["PUBLISHED" as const, "DRAFT" as const] } } : { status: "PUBLISHED" as const };
  const [spaces, curations, people] = await Promise.all([
    prisma.editorialSpace.findMany({ where }),
    prisma.editorialCuration.findMany({ where, include: { spaces: linkInclude } }),
    prisma.editorialPerson.findMany({ where, include: { spaces: linkInclude } }),
  ]);

  const sortTime = (r: { publishedAt: Date | null; updatedAt: Date }) => (r.publishedAt ?? r.updatedAt).getTime();
  const rows: { t: number; created: number; item: ContentItem }[] = [];

  for (const r of curations) {
    const c = toCurationView(r, v);
    rows.push({
      t: sortTime(r), created: r.createdAt.getTime(),
      item: {
        key: `curation-${c.id}`, kind: "curation", eyebrow: curationLabel(c), title: c.title, summary: c.summary,
        meta: c.spaces.length ? (c.area ? `${c.area}에서 발견한 ${c.spaces.length}개의 공간` : `공간 ${c.spaces.length}곳`) : undefined,
        href: `/curation/${c.slug}`, image: c.cover, date: formatEditorialDate(c.publishedAt), status: c.status,
      },
    });
  }
  for (const r of people) {
    const p = toPersonView(r, v);
    rows.push({
      t: sortTime(r), created: r.createdAt.getTime(),
      item: {
        key: `person-${p.id}`, kind: "person", eyebrow: p.subject ? `${formatPeopleNumber(p.number)} · ${p.subject}` : formatPeopleNumber(p.number),
        title: p.title, summary: p.summary, href: `/people/${p.slug}`, image: p.cover, date: formatEditorialDate(p.publishedAt), status: p.status,
      },
    });
  }
  for (const r of spaces) {
    const s = toSpaceView(r);
    rows.push({
      t: sortTime(r), created: r.createdAt.getTime(),
      item: {
        key: `space-${s.id}`, kind: "space", eyebrow: [s.area, s.category].filter(Boolean).join(" · "), title: s.name, summary: s.summary,
        href: spaceHref(s.slug), image: spaceCoverImage(s), date: formatEditorialDate(r.publishedAt), partner: s.cubeAvailable, status: s.status,
      },
    });
  }
  // 최신 발행 순, 같은 시각이면 먼저 만든 것이 앞(등록 순서 유지)
  rows.sort((a, b) => b.t - a.t || a.created - b.created);
  return rows.map((r) => r.item);
}
