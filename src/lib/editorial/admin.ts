/* ── Editorial CMS 관리자 화면용 조회(서버 전용) ── */

import { prisma } from "@/lib/prisma";
import { readStoredBlocks } from "./input";
import type { EditorialBlock, EditorialStatusValue } from "./types";

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

/** 공간 콘텐츠 태그 제안 — 추천에 쓰이는 활성 운영 태그 이름(공개 공간과 운영 공간이 같은 어휘를 쓰도록). */
export async function getTagSuggestions(): Promise<string[]> {
  const rows = await prisma.tag.findMany({
    where: { isActive: true, useForRecommendation: true },
    orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  return [...new Set(rows.map((r) => r.name))];
}
