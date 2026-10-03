/* ── 내 아카이브 라이브러리(서버 전용) ────────────────────────────────────────
   네 갈래의 기록을 "공간 하나 = 타일 하나"로 합친다. 원본 데이터는 그대로 두고 화면에서만 묶는다.
   1) 개인 아카이브 기록(ArchiveEntry — 사진·링크로 직접 추가, 다녀왔어요/또 갔어요)
   2) Cube 방문(Record — 검증된 실제 방문)
   3) 공개 공간 저장(SavedEditorialSpace) 4) Cube 상세 저장(SavedSpace)
   공간이 있는 기록은 slug 기준(s-<slug>, 공개 공간과 운영 공간은 slug가 같다), 공개 공간이 없는 개인 기록은 e-<id>.
   커버는 내가 찍은 사진을 먼저, 없으면 공간 대표 사진. 모두 본인만 보는 화면이다. ── */

import { prisma } from "@/lib/prisma";
import { LISTED_SPACE_WHERE } from "@/lib/demoData";
import { normalizeArea } from "@/lib/editorial/area";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import { compactName, SOURCE_KIND_LABEL } from "./source";

export type LibraryView = "all" | "visited" | "saved";

export interface LibraryItem {
  key: string;
  name: string;
  area: string | null;
  meta: string;
  cover: string | null;
  coverIsMine: boolean;
  visited: boolean;
  saved: boolean;
  /** 개인 기록 방문 + Cube 방문 */
  visitCount: number;
  cubeVisits: number;
  photoCount: number;
  lastAt: Date;
  tags: string[];
  /** 공간큐브 공개 공간과 연결되지 않은 개인 기록 */
  personal: boolean;
  /** 프로토타입 가상 공간 */
  demo: boolean;
  /** 직접 추가한 경로(사진·Instagram·네이버 지도 등) — 사진 없는 칸에 표시 */
  source: string | null;
}

export function libraryHref(key: string): string {
  return `/archive/p/${encodeURIComponent(key)}`;
}

export async function getLibrary(userId: string, opts: { includeDemo: boolean }): Promise<LibraryItem[]> {
  const spaceVisible = (sp: { status: string; isDemo: boolean } | null) => !!sp && sp.status === "PUBLISHED" && (opts.includeDemo || !sp.isDemo);
  const [entries, records, savedEds, savedOps] = await Promise.all([
    prisma.archiveEntry.findMany({
      where: { userId },
      include: {
        space: { select: { slug: true, name: true, area: true, category: true, coverImage: true, status: true, isDemo: true } },
        photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], take: 1, select: { url: true } },
        visits: { select: { visitedOn: true, createdAt: true } },
        _count: { select: { photos: true } },
      },
    }),
    // 개인 기록이라 Cube 방문은 시연 공간도 포함해 그대로 보여준다(기존 아카이브와 같은 원칙).
    prisma.record.findMany({
      where: { userId },
      select: {
        visitedAt: true,
        space: { select: { slug: true, name: true, district: true, imageUrl: true, type: true, spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } } } },
      },
    }),
    prisma.savedEditorialSpace.findMany({
      where: { userId, space: { status: "PUBLISHED", ...(opts.includeDemo ? {} : { isDemo: false }) } },
      select: { createdAt: true, space: { select: { slug: true, name: true, area: true, category: true, coverImage: true, isDemo: true } } },
    }),
    prisma.savedSpace.findMany({
      where: { userId, space: LISTED_SPACE_WHERE },
      select: { createdAt: true, space: { select: { slug: true, name: true, district: true, imageUrl: true, type: true, spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } } } } },
    }),
  ]);

  const items = new Map<string, LibraryItem>();
  const touch = (key: string, base: () => LibraryItem): LibraryItem => {
    const found = items.get(key);
    if (found) return found;
    const created = base();
    items.set(key, created);
    return created;
  };
  const later = (a: Date, b: Date) => (b.getTime() > a.getTime() ? b : a);

  for (const e of entries) {
    const linked = e.space && spaceVisible(e.space) ? e.space : null;
    const key = linked ? `s-${linked.slug}` : `e-${e.id}`;
    const it = touch(key, () => ({
      key, name: linked?.name ?? e.placeName, area: e.placeArea ?? linked?.area ?? null,
      meta: [e.placeArea ?? linked?.area, linked?.category].filter(Boolean).join(" · "),
      cover: null, coverIsMine: false, visited: false, saved: false, visitCount: 0, cubeVisits: 0, photoCount: 0,
      lastAt: e.updatedAt, tags: [], personal: !linked, demo: !!linked?.isDemo,
      source: e.sourceKind === "MANUAL" || e.sourceKind === "PHOTO" ? null : SOURCE_KIND_LABEL[e.sourceKind],
    }));
    if (e.photos[0]) { it.cover = e.photos[0].url; it.coverIsMine = true; }
    else if (!it.cover && linked?.coverImage) it.cover = linked.coverImage;
    it.photoCount += e._count.photos;
    it.visitCount += e.visits.length;
    if (e.status === "VISITED") it.visited = true; else it.saved = true;
    it.tags = [...new Set([...it.tags, ...e.tags])];
    it.lastAt = later(it.lastAt, e.updatedAt);
    for (const v of e.visits) it.lastAt = later(it.lastAt, v.visitedOn ?? v.createdAt);
  }

  for (const r of records) {
    const key = `s-${r.space.slug}`;
    const it = touch(key, () => ({
      key, name: r.space.name, area: r.space.district, meta: [r.space.district, resolveSpaceTypeLabel(r.space.spaceTagLinks, r.space.type)].filter(Boolean).join(" · "),
      cover: null, coverIsMine: false, visited: true, saved: false, visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: r.visitedAt, tags: [], personal: false, demo: false, source: null,
    }));
    it.visited = true;
    it.cubeVisits += 1;
    it.visitCount += 1;
    if (!it.cover && r.space.imageUrl) it.cover = r.space.imageUrl;
    it.lastAt = later(it.lastAt, r.visitedAt);
  }

  for (const s of savedEds) {
    const key = `s-${s.space.slug}`;
    const it = touch(key, () => ({
      key, name: s.space.name, area: s.space.area, meta: [s.space.area, s.space.category].filter(Boolean).join(" · "),
      cover: null, coverIsMine: false, visited: false, saved: true, visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: s.createdAt, tags: [], personal: false, demo: s.space.isDemo, source: null,
    }));
    it.saved = true;
    if (!it.cover && s.space.coverImage) it.cover = s.space.coverImage;
    it.lastAt = later(it.lastAt, s.createdAt);
  }

  for (const s of savedOps) {
    const key = `s-${s.space.slug}`;
    const it = touch(key, () => ({
      key, name: s.space.name, area: s.space.district, meta: [s.space.district, resolveSpaceTypeLabel(s.space.spaceTagLinks, s.space.type)].filter(Boolean).join(" · "),
      cover: null, coverIsMine: false, visited: false, saved: true, visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: s.createdAt, tags: [], personal: false, demo: false, source: null,
    }));
    it.saved = true;
    if (!it.cover && s.space.imageUrl) it.cover = s.space.imageUrl;
    it.lastAt = later(it.lastAt, s.createdAt);
  }

  // 다녀온 곳은 "저장"보다 "다녀옴"이 대표 상태다(둘 다 참일 수 있지만 필터는 아래 filterLibrary에서 구분).
  return [...items.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export interface LibraryFilter {
  view: LibraryView;
  q: string;
  area: string | null;
  tag: string | null;
}

export function parseLibraryFilter(sp: { view?: string; q?: string; area?: string; tag?: string }): LibraryFilter {
  const view: LibraryView = sp.view === "visited" || sp.view === "saved" ? sp.view : "all";
  return { view, q: (sp.q ?? "").trim().slice(0, 40), area: normalizeArea(sp.area), tag: sp.tag?.trim().slice(0, 20) || null };
}

/** 순수 필터 — 보기(전체/다녀온/저장한) · 이름 · 지역 · 내 태그. 저장한 공간 = 아직 다녀오지 않은 곳. */
export function filterLibrary(items: LibraryItem[], f: LibraryFilter): LibraryItem[] {
  const needle = compactName(f.q);
  return items.filter((it) =>
    (f.view === "all" || (f.view === "visited" ? it.visited : it.saved && !it.visited)) &&
    (!needle || compactName(it.name).includes(needle)) &&
    (!f.area || normalizeArea(it.area) === f.area) &&
    (!f.tag || it.tags.includes(f.tag)),
  );
}
