/* ── HOME 선반 설정 읽기(서버 전용) ─────────────────────────────────────────
   설정 테이블을 읽지 못해도(미적용 DB 등) HOME이 깨지지 않도록 기본 구성(설정 없음)으로 되돌린다. ── */

import { prisma } from "@/lib/prisma";
import type { ShelfRow } from "./shelfConfig";

export interface EditorialShelfRow extends ShelfRow {
  spaces: { spaceId: string; note: string | null }[];
}

export async function loadShelfRows(): Promise<EditorialShelfRow[]> {
  try {
    const rows = await prisma.homeShelf.findMany({
      orderBy: { createdAt: "asc" },
      include: { spaces: { orderBy: { order: "asc" }, select: { spaceId: true, note: true } } },
    });
    return rows.map((r) => ({ id: r.id, key: r.key, kind: r.kind, title: r.title, description: r.description, visible: r.visible, order: r.order, spaces: r.spaces }));
  } catch (e) {
    console.error("[home] shelf settings unavailable — using defaults", e);
    return [];
  }
}
