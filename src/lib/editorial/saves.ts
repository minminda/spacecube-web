/* ── 공개 공간 저장(SavedEditorialSpace) ─────────────────────────────────
   "나중에 가보고 싶은 공간". 아카이브의 저장한 공간, 추천의 중간 신호로 쓴다.
   운영 공간 저장(SavedSpace, Cube 상세의 저장)과는 별개 테이블 — 화면에서는 slug로 합쳐 보여준다. ── */

import { prisma } from "@/lib/prisma";

/** 이 사용자가 저장한 공간 콘텐츠 id 집합(비로그인은 빈 집합). */
export async function getSavedEditorialSpaceIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.savedEditorialSpace.findMany({ where: { userId }, select: { spaceId: true } });
  return new Set(rows.map((r) => r.spaceId));
}
