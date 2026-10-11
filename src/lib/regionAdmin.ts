/* ── 지역 관리 서버 조회 — 지역을 쓰는 공간(운영 공간 · 공간 등록)을 모은다 ── */

import { prisma } from "@/lib/prisma";
import type { UsedAreaValue } from "@/lib/regions";

/** 시연 공간(isDemo)은 제외한 공간들의 지역 문자열 + slug. 운영 공간(Space)과 공간 등록(EditorialSpace)을 함께 본다. */
export async function getUsedAreaValues(): Promise<UsedAreaValue[]> {
  const [spaces, editorial] = await Promise.all([
    prisma.space.findMany({ where: { isDemo: false, district: { not: null } }, select: { slug: true, district: true } }),
    prisma.editorialSpace.findMany({ where: { isDemo: false, status: { not: "ARCHIVED" } }, select: { slug: true, area: true } }),
  ]);
  return [
    ...spaces.map((s) => ({ value: s.district ?? "", slug: s.slug })),
    ...editorial.map((e) => ({ value: e.area, slug: e.slug })),
  ].filter((u) => u.value.trim());
}
