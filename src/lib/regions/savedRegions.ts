/* ── 관심 지역 읽기(서버 전용) ─────────────────────────────────────────────────
   로그인 사용자는 SavedRegion 테이블, 비로그인은 이 브라우저의 쿠키(sc_regions). 최근에 별표한 지역이 먼저.
   테이블을 읽지 못해도(아직 배포 전 등) 화면이 깨지지 않게 빈 목록으로 돌아간다. ── */

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { REGION_COOKIE, parseRegionCookie } from "./saved";

export async function getSavedRegions(userId: string | null): Promise<string[]> {
  if (userId) {
    try {
      const rows = await prisma.savedRegion.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { area: true } });
      return rows.map((r) => r.area);
    } catch {
      return [];
    }
  }
  return parseRegionCookie((await cookies()).get(REGION_COOKIE)?.value);
}
