/* ── Editorial CMS 관리자 화면용 조회(서버 전용) ── */

import { prisma } from "@/lib/prisma";
import { readStoredBlocks } from "./input";
import type { EditorialBlock, EditorialStatusValue } from "./types";
import type { EditorialPriorityValue } from "./pipeline";
import { normalizeArea } from "./area";
import { toSpaceView } from "./queries";
import type { SpaceView } from "./types";

export interface SpaceOptionRow {
  id: string;
  name: string;
  area: string;
  category: string;
  status: EditorialStatusValue;
}

/**
 * 연결 공간·공간 카드 선택지 — 모든 공간 콘텐츠(보관 포함, 선택 UI에서 보관은 새로 고를 수 없게 거른다).
 * 큐레이터 프로토타입 가상 공간은 공식 콘텐츠(큐레이션·피플·생각)에서 고를 수 없다 — 큐레이터 컬렉션만 includeDemo.
 */
export async function getSpaceOptions(opts: { includeDemo?: boolean } = {}): Promise<SpaceOptionRow[]> {
  return prisma.editorialSpace.findMany({
    where: opts.includeDemo ? {} : { isDemo: false },
    orderBy: [{ area: "asc" }, { name: "asc" }],
    select: { id: true, name: true, area: true, category: true, status: true },
  });
}

export async function nextCurationNumber(): Promise<number> {
  const agg = await prisma.editorialCuration.aggregate({ _max: { number: true } });
  return (agg._max.number ?? 0) + 1;
}

export async function nextPersonNumber(): Promise<number> {
  const agg = await prisma.editorialPerson.aggregate({ _max: { number: true } });
  return (agg._max.number ?? 0) + 1;
}

export function storedBlocks(raw: unknown): EditorialBlock[] {
  return readStoredBlocks(raw);
}

export async function nextThoughtNumber(): Promise<number> {
  const agg = await prisma.editorialThought.aggregate({ _max: { number: true } });
  return (agg._max.number ?? 0) + 1;
}

/** 관리자 Tag 중 "공간 유형" 분류의 이름 — Type 선택 칩에 쓴다(태그 선택에서는 제외). */
export const TYPE_CATEGORY_NAME = "공간 유형";

export interface TagGroup { category: string; tags: string[] }

/** 공간 등록 태그 선택지 — 관리자 Tag(정본)의 활성 태그를 분류별로 묶는다. */
export async function getTagGroups(): Promise<TagGroup[]> {
  const cats = await prisma.category.findMany({
    where: { isActive: true, name: { not: TYPE_CATEGORY_NAME } },
    orderBy: { displayOrder: "asc" },
    include: { tags: { where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { name: true } } },
  });
  const loose = await prisma.tag.findMany({ where: { isActive: true, categoryId: null }, orderBy: { displayOrder: "asc" }, select: { name: true } });
  const groups: TagGroup[] = cats.map((c) => ({ category: c.name, tags: c.tags.map((t) => t.name) })).filter((g) => g.tags.length > 0);
  if (loose.length > 0) groups.push({ category: "기타", tags: loose.map((t) => t.name) });
  return groups;
}

/** 공간 유형(Type) 제안 — 관리자 "공간 유형" 태그 + 이미 등록된 공간의 유형. 대표 유형은 공간당 1개. */
export async function getTypeSuggestions(): Promise<string[]> {
  const [rows, typeTags] = await Promise.all([
    prisma.editorialSpace.groupBy({ by: ["category"], where: { isDemo: false, status: { not: "ARCHIVED" } }, _count: { _all: true }, orderBy: { _count: { category: "desc" } } }),
    prisma.tag.findMany({ where: { isActive: true, categoryRef: { name: TYPE_CATEGORY_NAME } }, orderBy: { displayOrder: "asc" }, select: { name: true } }),
  ]);
  return [...new Set([...rows.map((r) => r.category.trim()), ...typeTags.map((t) => t.name)].filter(Boolean))];
}

/** 공간 등록 지역 선택지 — 관리자에 등록된 지역(District). */
export async function getRegionSuggestions(): Promise<string[]> {
  const rows = await prisma.district.findMany({ orderBy: { order: "asc" }, select: { name: true } });
  return rows.map((r) => r.name);
}

/** 큐레이션 지역 선택지 — canonical 공간 콘텐츠(EditorialSpace, 가상 공간 제외)의 정규화된 지역(area.ts). 새 지역 목록을 따로 두지 않는다. */
export async function getAreaOptions(): Promise<string[]> {
  const rows = await prisma.editorialSpace.findMany({ where: { isDemo: false, status: { not: "ARCHIVED" } }, select: { area: true }, distinct: ["area"] });
  return [...new Set(rows.map((r) => normalizeArea(r.area)).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b, "ko"));
}

/** Date → KST "YYYY-MM-DD"(date input 값) */
export function toKstDateInput(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** 편집 폼의 제작 관리 초기값(행 → 폼 문자열). */
export function opsInitial(r: {
  priority: EditorialPriorityValue; assignee: string | null; scheduledAt: Date | null; referenceLinks: string[];
  internalNote: string | null; instagramSummary: string | null;
}) {
  return {
    priority: r.priority,
    assignee: r.assignee ?? "",
    scheduledAt: toKstDateInput(r.scheduledAt),
    referenceLinks: r.referenceLinks.join("\n"),
    internalNote: r.internalNote ?? "",
    instagramSummary: r.instagramSummary ?? "",
  };
}

export const EMPTY_OPS_INITIAL = { priority: "MEDIUM" as EditorialPriorityValue, assignee: "", scheduledAt: "", referenceLinks: "", internalNote: "", instagramSummary: "" };

/**
 * 실시간 미리보기용 공간 정보 — 공개 화면에 실제로 나오는 공간(발행 · 실공간)만, 공개 렌더러가 쓰는 SpaceView 그대로.
 * 미리보기는 독자가 볼 화면이므로 초안 공간은 넣지 않는다(공개 상세에서도 빠진다).
 */
export async function getPreviewSpaceViews(): Promise<Record<string, SpaceView>> {
  const rows = await prisma.editorialSpace.findMany({ where: { status: "PUBLISHED", isDemo: false } });
  return Object.fromEntries(rows.map((r) => [r.id, toSpaceView(r)]));
}
