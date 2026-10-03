/* ── 개인 아카이브 기록(서버 전용) ─────────────────────────────────────────
   모든 함수는 userId를 받아 "내 기록"만 다룬다(다른 사람 기록은 없는 것처럼 404).
   공개 공간에 연결된 기록은 사용자당 공간당 하나 — 같은 공간을 다시 추가하면 새 기록 대신 사진·방문을 덧붙인다.
   상태를 바꿔도 지우지 않는다: 저장 → 다녀왔어요(방문 1건 추가) → 또 갔어요(방문 추가). ── */

import { prisma } from "@/lib/prisma";
import { compactName, linkMatchesSpace, parseHttpUrl, placeKey, detectSourceKind, type SourceKind } from "./source";
import type { CreateEntryInput, PatchEntryInput, PhotoInput, VisitInput } from "./input";

/** 아카이브에서 고를 수 있는 공통 취향 태그 — 기존 활성 태그 중 "공간 유형"이 아닌 것(분위기 태그). */
export async function getArchiveTagOptions(): Promise<string[]> {
  const rows = await prisma.tag.findMany({
    where: { isActive: true, OR: [{ categoryId: null }, { categoryRef: { name: { not: "공간 유형" } } }] },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  return [...new Set(rows.map((r) => r.name))];
}

export interface SpaceMatch {
  id: string;
  slug: string;
  name: string;
  area: string;
  category: string;
  coverImage: string | null;
  matchedBy: "link" | "name";
}

/**
 * 공간큐브에 이미 있는 공간 찾기 — 붙여넣은 링크가 공간의 지도·인스타·웹 주소와 같거나(네이버 플레이스 번호 포함),
 * 이름이 비슷하면 후보로. 발행된 공간만(가상 공간은 미리보기 권한일 때만). 외부 페이지는 읽지 않는다.
 */
export async function findSpaceMatches(q: string, url: string | null, opts: { includeDemo: boolean }): Promise<{ kind: SourceKind | null; matches: SpaceMatch[] }> {
  const pasted = parseHttpUrl(url);
  const rows = await prisma.editorialSpace.findMany({
    where: { status: "PUBLISHED", ...(opts.includeDemo ? {} : { isDemo: false }) },
    select: { id: true, slug: true, name: true, area: true, category: true, coverImage: true, mapUrl: true, instagram: true, website: true },
  });
  const out: SpaceMatch[] = [];
  if (pasted) {
    for (const r of rows) if (linkMatchesSpace(pasted, [r.mapUrl, r.instagram, r.website])) out.push({ ...pick(r), matchedBy: "link" });
  }
  const needle = compactName(q);
  if (needle.length >= 1) {
    for (const r of rows) {
      if (out.some((o) => o.id === r.id)) continue;
      const hay = compactName(r.name);
      if (hay.includes(needle) || (needle.length >= 2 && needle.includes(hay))) out.push({ ...pick(r), matchedBy: "name" });
    }
  }
  return { kind: pasted ? detectSourceKind(pasted) : null, matches: out.slice(0, 5) };
}

function pick(r: { id: string; slug: string; name: string; area: string; category: string; coverImage: string | null }) {
  return { id: r.id, slug: r.slug, name: r.name, area: r.area, category: r.category, coverImage: r.coverImage };
}

function sourceKindOf(input: CreateEntryInput): "PHOTO" | SourceKind | "MANUAL" {
  const u = parseHttpUrl(input.sourceUrl);
  if (u) return detectSourceKind(u);
  return input.fromPhoto ? "PHOTO" : "MANUAL";
}

function photoRows(entryId: string, photos: PhotoInput[], visitId: string | null, startOrder: number) {
  return photos.map((p, i) => ({ entryId, visitId, url: p.url, width: p.width ?? null, height: p.height ?? null, order: startOrder + i }));
}

export class ArchiveError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * 공간 추가. 연결 공간이 있고 이미 내 기록이 있으면 그 기록에 덧붙인다(merged=true).
 * "가보고 싶어요"로 공개 공간을 추가하면 공개 저장(SavedEditorialSpace)도 함께 남겨 다른 화면의 저장 표시와 맞춘다.
 */
export async function createOrMergeEntry(userId: string, input: CreateEntryInput, opts: { includeDemo: boolean }): Promise<{ id: string; merged: boolean; visitId: string | null }> {
  let space: { id: string; name: string; area: string } | null = null;
  if (input.spaceId) {
    space = await prisma.editorialSpace.findFirst({
      where: { id: input.spaceId, status: "PUBLISHED", ...(opts.includeDemo ? {} : { isDemo: false }) },
      select: { id: true, name: true, area: true },
    });
    if (!space) throw new ArchiveError(404, "연결할 공간을 찾을 수 없어요.");
  }
  const sourceKind = sourceKindOf(input);
  const visited = input.status === "VISITED";

  return prisma.$transaction(async (tx) => {
    const existing = space ? await tx.archiveEntry.findUnique({ where: { userId_spaceId: { userId, spaceId: space.id } } }) : null;
    let entryId: string;
    let merged = false;
    if (existing) {
      merged = true;
      entryId = existing.id;
      await tx.archiveEntry.update({
        where: { id: existing.id },
        data: {
          ...(visited ? { status: "VISITED" as const } : {}),
          ...(input.memo && !existing.memo ? { memo: input.memo } : {}),
          ...(input.tags.length ? { tags: [...new Set([...existing.tags, ...input.tags])].slice(0, 6) } : {}),
          ...(input.sourceUrl && !existing.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
        },
      });
    } else {
      const name = space?.name ?? input.placeName;
      const area = input.placeArea ?? space?.area ?? null;
      const created = await tx.archiveEntry.create({
        data: {
          userId, spaceId: space?.id ?? null, placeName: name, placeArea: area, placeKey: placeKey(name, area),
          status: input.status, sourceKind, sourceUrl: input.sourceUrl, memo: input.memo, tags: input.tags,
        },
        select: { id: true },
      });
      entryId = created.id;
    }
    let visitId: string | null = null;
    if (visited && input.addVisit) {
      const v = await tx.archiveVisit.create({ data: { entryId, visitedOn: input.visitedOn, memo: merged ? input.memo : null }, select: { id: true } });
      visitId = v.id;
    }
    if (input.photos.length) {
      const count = await tx.archivePhoto.count({ where: { entryId } });
      await tx.archivePhoto.createMany({ data: photoRows(entryId, input.photos, visitId, count) });
    }
    if (space && !visited) {
      await tx.savedEditorialSpace.upsert({ where: { userId_spaceId: { userId, spaceId: space.id } }, create: { userId, spaceId: space.id }, update: {} });
    }
    return { id: entryId, merged, visitId };
  });
}

async function ownEntry(userId: string, entryId: string) {
  const e = await prisma.archiveEntry.findFirst({ where: { id: entryId, userId } });
  if (!e) throw new ArchiveError(404, "기록을 찾을 수 없어요.");
  return e;
}

export async function updateEntry(userId: string, entryId: string, patch: PatchEntryInput): Promise<void> {
  const e = await ownEntry(userId, entryId);
  const name = patch.placeName ?? e.placeName;
  const area = patch.placeArea !== undefined ? patch.placeArea : e.placeArea;
  await prisma.archiveEntry.update({
    where: { id: e.id },
    data: {
      ...patch,
      // 연결 공간이 없는 개인 기록만 병합 키를 다시 계산(연결된 기록은 공간 id가 기준)
      ...(patch.placeName !== undefined || patch.placeArea !== undefined ? { placeKey: placeKey(name, area) } : {}),
    },
  });
}

/** 다녀왔어요 / 또 갔어요 — 방문 1건 추가(사진·메모·날짜 선택), 상태는 VISITED로. 기존 방문·사진은 그대로. */
export async function addVisit(userId: string, entryId: string, input: VisitInput): Promise<{ visitId: string }> {
  const e = await ownEntry(userId, entryId);
  return prisma.$transaction(async (tx) => {
    const v = await tx.archiveVisit.create({ data: { entryId: e.id, visitedOn: input.visitedOn, memo: input.memo }, select: { id: true } });
    if (input.photos.length) {
      const count = await tx.archivePhoto.count({ where: { entryId: e.id } });
      await tx.archivePhoto.createMany({ data: photoRows(e.id, input.photos, v.id, count) });
    }
    if (e.status !== "VISITED") await tx.archiveEntry.update({ where: { id: e.id }, data: { status: "VISITED" } });
    else await tx.archiveEntry.update({ where: { id: e.id }, data: { updatedAt: new Date() } });
    return { visitId: v.id };
  });
}

export async function addPhotos(userId: string, entryId: string, photos: PhotoInput[]): Promise<void> {
  const e = await ownEntry(userId, entryId);
  const count = await prisma.archivePhoto.count({ where: { entryId: e.id } });
  await prisma.archivePhoto.createMany({ data: photoRows(e.id, photos, null, count) });
}

/** 대표 사진 바꾸기 — 그 사진을 맨 앞으로(순서만 바꾼다). */
export async function setCoverPhoto(userId: string, entryId: string, photoId: string): Promise<void> {
  const e = await ownEntry(userId, entryId);
  const photos = await prisma.archivePhoto.findMany({ where: { entryId: e.id }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true } });
  if (!photos.some((p) => p.id === photoId)) throw new ArchiveError(404, "사진을 찾을 수 없어요.");
  const ordered = [photoId, ...photos.map((p) => p.id).filter((id) => id !== photoId)];
  await prisma.$transaction(ordered.map((id, i) => prisma.archivePhoto.update({ where: { id }, data: { order: i } })));
}

/** 방문 날짜·메모 고치기("조금 더 기록할까요?"에서 날짜를 나중에 넣을 때). */
export async function updateVisit(userId: string, entryId: string, patch: { visitId: string; visitedOn?: Date | null; memo?: string | null }): Promise<void> {
  const e = await ownEntry(userId, entryId);
  const v = await prisma.archiveVisit.findFirst({ where: { id: patch.visitId, entryId: e.id }, select: { id: true } });
  if (!v) throw new ArchiveError(404, "방문을 찾을 수 없어요.");
  // undefined 필드는 Prisma가 건드리지 않는다(보낸 값만 바뀜)
  await prisma.archiveVisit.update({ where: { id: v.id }, data: { visitedOn: patch.visitedOn, memo: patch.memo } });
}
