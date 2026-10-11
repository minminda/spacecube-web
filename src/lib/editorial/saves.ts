/* ── 공개 공간 저장(SavedEditorialSpace) ─────────────────────────────────
   "나중에 가보고 싶은 공간". 아카이브의 저장한 공간, 추천의 중간 신호로 쓴다.
   운영 공간 저장(SavedSpace, Cube 상세의 저장)과는 별개 테이블 — 화면에서는 slug로 합쳐 보여준다.
   공개 화면의 저장 표시(HOME · 상세 · 검색 · 찜한 공간)도 같은 규칙: 어느 쪽에서 저장했든 저장된 공간으로 본다. ── */

import { prisma } from "@/lib/prisma";

/** 운영 공간 slug → 같은 slug의 발행된 공개 공간 id(연결되지 않은 slug는 건너뛴다). */
export async function editorialIdsBySlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await prisma.editorialSpace.findMany({ where: { slug: { in: slugs }, status: "PUBLISHED" }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** 이 사용자가 저장한 공간 콘텐츠 id 집합(비로그인은 빈 집합) — 공개 저장 + Cube 상세에서 저장한 운영 공간(slug로 연결). */
export async function getSavedEditorialSpaceIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const [rows, ops] = await Promise.all([
    prisma.savedEditorialSpace.findMany({ where: { userId }, select: { spaceId: true } }),
    prisma.savedSpace.findMany({ where: { userId, space: { isDemo: false } }, select: { space: { select: { slug: true } } } }),
  ]);
  const viaOps = await editorialIdsBySlugs(ops.map((o) => o.space.slug));
  return new Set([...rows.map((r) => r.spaceId), ...viaOps]);
}
