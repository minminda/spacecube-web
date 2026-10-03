/* ── 아카이브 공간 하나의 상세(서버 전용, 본인 것만) ──────────────────────────────
   키: s-<slug>(공간큐브 공간 — 개인 기록·Cube 방문·저장을 합침) / e-<entryId>(공간큐브에 없는 개인 기록).
   공개 공간에 연결된 개인 기록을 e-로 열면 s-로 보낸다(같은 공간이 두 주소를 갖지 않게). ── */

import { prisma } from "@/lib/prisma";

export type DetailResult =
  | { kind: "redirect"; key: string }
  | { kind: "notFound" }
  | { kind: "ok"; data: ArchiveDetail };

export interface DetailPhoto {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
}

export interface TimelineItem {
  key: string;
  at: Date;
  /** 날짜를 사용자가 남겼는지(아니면 기록한 날) */
  dated: boolean;
  kind: "visit" | "cube";
  memo: string | null;
  photos: DetailPhoto[];
}

export interface ArchiveDetail {
  key: string;
  name: string;
  area: string | null;
  category: string | null;
  entry: { id: string; status: "SAVED" | "VISITED"; memo: string | null; tags: string[]; wantAgain: boolean | null; sourceUrl: string | null; sourceKind: string; placeArea: string | null; createdAt: Date } | null;
  editorial: { id: string; slug: string; coverImage: string | null; isDemo: boolean } | null;
  operational: { id: string } | null;
  cover: string | null;
  coverIsMine: boolean;
  photos: DetailPhoto[];
  timeline: TimelineItem[];
  visited: boolean;
  saved: boolean;
  cubeVisits: number;
}

const photoSelect = { id: true, url: true, width: true, height: true } as const;

export async function getArchiveDetail(userId: string, key: string, opts: { includeDemo: boolean }): Promise<DetailResult> {
  const visible = (sp: { status: string; isDemo: boolean }) => sp.status === "PUBLISHED" && (opts.includeDemo || !sp.isDemo);

  if (key.startsWith("e-")) {
    const entry = await prisma.archiveEntry.findFirst({
      where: { id: key.slice(2), userId },
      include: { space: { select: { slug: true, status: true, isDemo: true } } },
    });
    if (!entry) return { kind: "notFound" };
    if (entry.space && visible(entry.space)) return { kind: "redirect", key: `s-${entry.space.slug}` };
    const full = await loadEntry(entry.id);
    return { kind: "ok", data: build(key, entry.placeName, entry.placeArea, null, full, null, null, [], false) };
  }

  if (!key.startsWith("s-")) return { kind: "notFound" };
  const slug = key.slice(2);
  const [ed, op] = await Promise.all([
    prisma.editorialSpace.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, area: true, category: true, coverImage: true, status: true, isDemo: true } }),
    prisma.space.findUnique({ where: { slug }, select: { id: true, name: true, district: true, imageUrl: true, type: true } }),
  ]);
  const editorial = ed && visible(ed) ? ed : null;
  const [entryRow, records, savedEd, savedOp] = await Promise.all([
    editorial ? prisma.archiveEntry.findUnique({ where: { userId_spaceId: { userId, spaceId: editorial.id } }, select: { id: true } }) : Promise.resolve(null),
    op ? prisma.record.findMany({ where: { userId, spaceId: op.id }, orderBy: { visitedAt: "desc" }, select: { id: true, visitedAt: true } }) : Promise.resolve([]),
    editorial ? prisma.savedEditorialSpace.findUnique({ where: { userId_spaceId: { userId, spaceId: editorial.id } }, select: { id: true } }) : Promise.resolve(null),
    op ? prisma.savedSpace.findUnique({ where: { userId_spaceId: { userId, spaceId: op.id } }, select: { id: true } }) : Promise.resolve(null),
  ]);
  // 내 기록이 하나도 없는 공간이면 아카이브 상세가 아니다
  if (!entryRow && records.length === 0 && !savedEd && !savedOp) return { kind: "notFound" };
  if (!editorial && !op) return { kind: "notFound" };
  const full = entryRow ? await loadEntry(entryRow.id) : null;
  return {
    kind: "ok",
    data: build(
      key,
      editorial?.name ?? op!.name,
      full?.placeArea ?? editorial?.area ?? op?.district ?? null,
      editorial?.category ?? op?.type ?? null,
      full,
      editorial ? { id: editorial.id, slug: editorial.slug, coverImage: editorial.coverImage, isDemo: editorial.isDemo } : null,
      op ? { id: op.id, cover: op.imageUrl } : null,
      records,
      !!(savedEd || savedOp),
    ),
  };
}

async function loadEntry(id: string) {
  return prisma.archiveEntry.findUniqueOrThrow({
    where: { id },
    include: {
      photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { ...photoSelect, visitId: true } },
      visits: { orderBy: { createdAt: "desc" }, select: { id: true, visitedOn: true, memo: true, createdAt: true } },
    },
  });
}

function build(
  key: string,
  name: string,
  area: string | null,
  category: string | null,
  entry: Awaited<ReturnType<typeof loadEntry>> | null,
  editorial: ArchiveDetail["editorial"],
  op: { id: string; cover: string | null } | null,
  records: { id: string; visitedAt: Date }[],
  saved: boolean,
): ArchiveDetail {
  const photos = (entry?.photos ?? []).map((p) => ({ id: p.id, url: p.url, width: p.width, height: p.height }));
  const timeline: TimelineItem[] = [
    ...(entry?.visits ?? []).map((v) => ({
      key: `v-${v.id}`, at: v.visitedOn ?? v.createdAt, dated: !!v.visitedOn, kind: "visit" as const, memo: v.memo,
      photos: (entry?.photos ?? []).filter((p) => p.visitId === v.id).map((p) => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
    })),
    ...records.map((r) => ({ key: `r-${r.id}`, at: r.visitedAt, dated: true, kind: "cube" as const, memo: null, photos: [] })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const cover = photos[0]?.url ?? editorial?.coverImage ?? op?.cover ?? null;
  return {
    key, name, area, category,
    entry: entry ? { id: entry.id, status: entry.status, memo: entry.memo, tags: entry.tags, wantAgain: entry.wantAgain, sourceUrl: entry.sourceUrl, sourceKind: entry.sourceKind, placeArea: entry.placeArea, createdAt: entry.createdAt } : null,
    editorial,
    operational: op ? { id: op.id } : null,
    cover,
    coverIsMine: !!photos[0],
    photos,
    timeline,
    visited: entry?.status === "VISITED" || records.length > 0,
    saved: saved || entry?.status === "SAVED",
    cubeVisits: records.length,
  };
}
