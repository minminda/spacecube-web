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

/** 연결 공간·공간 카드 선택지 — 모든 공간 콘텐츠(보관 포함, 선택 UI에서 보관은 새로 고를 수 없게 거른다). */
export async function getSpaceOptions(): Promise<SpaceOptionRow[]> {
  return prisma.editorialSpace.findMany({
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
