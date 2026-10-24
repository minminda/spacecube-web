/* ── 내 아카이브 라이브러리(서버 전용) ────────────────────────────────────────
   네 갈래의 기록을 "공간 하나 = 타일 하나"로 합친다. 원본 데이터는 그대로 두고 화면에서만 묶는다.
   1) 개인 아카이브 기록(ArchiveEntry — 사진·링크로 직접 추가, 다녀왔어요/또 갔어요)
   2) Cube 방문(Record — 검증된 실제 방문)
   3) 공개 공간 저장(SavedEditorialSpace) 4) Cube 상세 저장(SavedSpace)
   공간이 있는 기록은 slug 기준(s-<slug>, 공개 공간과 운영 공간은 slug가 같다), 공개 공간이 없는 개인 기록은 e-<id>.
   커버는 내가 찍은 사진을 먼저, 없으면 공간 대표 사진. 모두 본인만 보는 화면이다. ── */

import { publicSpaceFilter, spaceUsable } from "@/lib/demoSpaces";
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
  /** 공개 공간 상세(/spaces/[slug])가 열리는 공간의 slug — 있으면 카드를 눌렀을 때 HOME과 같은 상세 창으로 열린다. 개인 기록 · 상세 없는 운영 공간은 null */
  slug: string | null;
}

export function libraryHref(key: string): string {
  return `/archive/p/${encodeURIComponent(key)}`;
}

/**
 * 내 공간 카드를 눌렀을 때 가는 곳 — 공개 상세가 있는 공간(실제 · 시연용 모두)은 HOME · 검색과 같은 /spaces/[slug](데스크톱은 가로채기 창),
 * 개인 기록 · 공개 상세가 없는 공간은 내 기록 상세. 상세 안의 "내 기록 보기 →"로 내 기록(사진 · 메모 · 방문)에 들어간다.
 */
export function libraryOpenHref(it: Pick<LibraryItem, "key" | "slug" | "personal">): string {
  return !it.personal && it.slug ? `/spaces/${encodeURIComponent(it.slug)}` : libraryHref(it.key);
}

async function fetchLibraryRows(userIds: string[], opts: { includeDemo: boolean }) {
  const [entries, records, savedEds, savedOps] = await Promise.all([
    prisma.archiveEntry.findMany({
      where: { userId: { in: userIds } },
      include: {
        space: { select: { slug: true, name: true, area: true, category: true, coverImage: true, status: true, isDemo: true } },
        photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], take: 1, select: { url: true } },
        visits: { select: { visitedOn: true, createdAt: true } },
        _count: { select: { photos: true } },
      },
    }),
    // 개인 기록이라 Cube 방문은 시연 공간도 포함해 그대로 보여준다(기존 아카이브와 같은 원칙).
    prisma.record.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        visitedAt: true,
        space: { select: { slug: true, name: true, district: true, imageUrl: true, type: true, spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } } } },
      },
    }),
    prisma.savedEditorialSpace.findMany({
      where: { userId: { in: userIds }, space: { status: "PUBLISHED", ...(opts.includeDemo ? {} : publicSpaceFilter()) } },
      select: { userId: true, createdAt: true, space: { select: { slug: true, name: true, area: true, category: true, coverImage: true, isDemo: true } } },
    }),
    prisma.savedSpace.findMany({
      where: { userId: { in: userIds }, space: LISTED_SPACE_WHERE },
      select: { userId: true, createdAt: true, space: { select: { slug: true, name: true, district: true, imageUrl: true, type: true, spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } } } } },
    }),
  ]);
  // 운영 공간(Cube 방문 · Cube 상세 저장)에 같은 slug의 공개 상세가 있는지 — 있으면 카드가 상세 창으로 열린다
  const opSlugs = [...new Set([...records.map((r) => r.space.slug), ...savedOps.map((s) => s.space.slug)])];
  const publicSlugs = new Set(
    opSlugs.length === 0
      ? []
      : (await prisma.editorialSpace.findMany({
          where: { slug: { in: opSlugs }, status: "PUBLISHED", ...(opts.includeDemo ? {} : publicSpaceFilter()) },
          select: { slug: true },
        })).map((r) => r.slug),
  );
  return { entries, records, savedEds, savedOps, publicSlugs };
}

type LibraryRows = Awaited<ReturnType<typeof fetchLibraryRows>>;

/** 사용자 여러 명의 라이브러리를 한 번에(쿼리 4개 고정) — 사람 추천처럼 후보마다 getLibrary를 부르면 N배가 되는 곳에서 쓴다. */
export async function getLibraries(userIds: string[], opts: { includeDemo: boolean }): Promise<Map<string, LibraryItem[]>> {
  const out = new Map<string, LibraryItem[]>(userIds.map((id) => [id, []]));
  if (userIds.length === 0) return out;
  const rows = await fetchLibraryRows(userIds, opts);
  const group = <T extends { userId: string }>(list: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of list) m.set(r.userId, [...(m.get(r.userId) ?? []), r]);
    return m;
  };
  const gEntries = group(rows.entries), gRecords = group(rows.records), gEds = group(rows.savedEds), gOps = group(rows.savedOps);
  const spaceVisible = (sp: { status: string; isDemo: boolean; slug: string } | null) => !!sp && sp.status === "PUBLISHED" && (opts.includeDemo || spaceUsable(sp));
  for (const id of userIds) {
    out.set(id, assembleLibrary(spaceVisible, {
      entries: gEntries.get(id) ?? [], records: gRecords.get(id) ?? [], savedEds: gEds.get(id) ?? [], savedOps: gOps.get(id) ?? [], publicSlugs: rows.publicSlugs,
    }));
  }
  return out;
}

export async function getLibrary(userId: string, opts: { includeDemo: boolean }): Promise<LibraryItem[]> {
  return (await getLibraries([userId], opts)).get(userId) ?? [];
}

function assembleLibrary(
  spaceVisible: (sp: { status: string; isDemo: boolean; slug: string } | null) => boolean,
  { entries, records, savedEds, savedOps, publicSlugs }: LibraryRows,
): LibraryItem[] {
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
      source: e.sourceKind === "MANUAL" || e.sourceKind === "PHOTO" ? null : SOURCE_KIND_LABEL[e.sourceKind], slug: null,
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
      cover: null, coverIsMine: false, visited: true, saved: false, visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: r.visitedAt, tags: [], personal: false, demo: false, source: null, slug: null,
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
      cover: null, coverIsMine: false, visited: false, saved: true, visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: s.createdAt, tags: [], personal: false, demo: s.space.isDemo, source: null, slug: null,
    }));
    it.saved = true;
    if (!it.cover && s.space.coverImage) it.cover = s.space.coverImage;
    it.lastAt = later(it.lastAt, s.createdAt);
  }

  for (const s of savedOps) {
    const key = `s-${s.space.slug}`;
    const it = touch(key, () => ({
      key, name: s.space.name, area: s.space.district, meta: [s.space.district, resolveSpaceTypeLabel(s.space.spaceTagLinks, s.space.type)].filter(Boolean).join(" · "),
      cover: null, coverIsMine: false, visited: false, saved: true, visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: s.createdAt, tags: [], personal: false, demo: false, source: null, slug: null,
    }));
    it.saved = true;
    if (!it.cover && s.space.imageUrl) it.cover = s.space.imageUrl;
    it.lastAt = later(it.lastAt, s.createdAt);
  }

  // 공개 상세가 있는 공간 — 연결된 공개 공간(기록 · 저장) 또는 같은 slug의 공개 상세가 있는 운영 공간
  const detailSlugs = new Set<string>(publicSlugs);
  for (const e of entries) if (e.space && spaceVisible(e.space)) detailSlugs.add(e.space.slug);
  for (const s of savedEds) detailSlugs.add(s.space.slug);
  for (const it of items.values()) it.slug = it.key.startsWith("s-") && detailSlugs.has(it.key.slice(2)) ? it.key.slice(2) : null;

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

/**
 * 기본 보기 — "다녀왔어요"가 저장보다 중요한 상태라 먼저 보여 준다. 다녀온 공간이 아직 없으면 저장을, 둘 다 없으면 다녀왔어요(빈 상태 안내)를.
 * 주소에 ?view=가 있으면 그 값이 우선이라 이 함수는 쓰지 않는다.
 */
export function defaultLibraryView(counts: { visited: number; saved: number }): LibraryView {
  if (counts.visited > 0) return "visited";
  return counts.saved > 0 ? "saved" : "visited";
}

/** 순수 필터 — 보기(전체/다녀왔어요/저장) · 이름 · 지역 · 내 태그. 저장 = 아직 다녀오지 않은 곳. 전체 보기에서는 다녀온 공간이 저장한 공간보다 앞(각각 최근 활동 순). */
export function filterLibrary(items: LibraryItem[], f: LibraryFilter): LibraryItem[] {
  const needle = compactName(f.q);
  const list = items.filter((it) =>
    (f.view === "all" || (f.view === "visited" ? it.visited : it.saved && !it.visited)) &&
    (!needle || compactName(it.name).includes(needle)) &&
    (!f.area || normalizeArea(it.area) === f.area) &&
    (!f.tag || it.tags.includes(f.tag)),
  );
  return f.view === "all" ? [...list].sort((a, b) => Number(b.visited) - Number(a.visited) || b.lastAt.getTime() - a.lastAt.getTime()) : list;
}
