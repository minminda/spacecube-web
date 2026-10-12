/* ── 내 공간 지도 — 새 저장소 없이 getLibrary 결과에서 계산하는 또 하나의 보기 ───────────────
   공간 하나 = 마커 하나. 상태는 저장하지 않고 매번 계산한다: 재방문(방문 2회+) > 다녀온 곳 > 저장(가보고 싶은 곳).
   좌표는 운영 Space(lat/lng)에 있고 공개 공간과 slug가 같다. 좌표 없는 공간·개인 기록은 지도에서만 빠진다. ── */

import { prisma } from "@/lib/prisma";
import { normalizeArea } from "@/lib/editorial/area";
import type { LibraryItem } from "./library";

export type MapState = "saved" | "visited" | "revisit";

export interface MapPoint {
  key: string;
  name: string;
  area: string | null;
  lat: number;
  lng: number;
  state: MapState;
  /** 다녀온 곳일 때만 의미가 있다(최소 1) */
  visitCount: number;
  /** 저장만 한 공간의 공개 상세 · 다녀온 공간의 내 기록 */
  href: string;
}

export interface MapMissing {
  key: string;
  name: string;
}

export interface Coord {
  lat: number;
  lng: number;
}

/** 재방문 > 방문 > 저장. 방문은 개인 기록 방문 + Cube 방문의 합(라이브러리와 같은 기준). 방문 이력 없이 "다녀옴"만 표시된 기록도 1회로 본다. */
export function mapState(it: Pick<LibraryItem, "visited" | "saved" | "visitCount">): MapState | null {
  if (it.visited) return it.visitCount >= 2 ? "revisit" : "visited";
  return it.saved ? "saved" : null;
}

export function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/** 순수 함수 — key는 라이브러리에서 이미 공간당 하나라 마커가 겹치지 않는다. coords의 키는 라이브러리 key. */
export function buildMapPoints(
  items: LibraryItem[],
  coords: Map<string, Coord>,
  hrefOf: (it: LibraryItem) => string,
): { points: MapPoint[]; missing: MapMissing[] } {
  const points: MapPoint[] = [];
  const missing: MapMissing[] = [];
  for (const it of items) {
    const state = mapState(it);
    if (!state) continue;
    const c = coords.get(it.key);
    if (!c || !isValidCoord(c.lat, c.lng)) {
      missing.push({ key: it.key, name: it.name });
      continue;
    }
    points.push({
      key: it.key,
      name: it.name,
      area: normalizeArea(it.area),
      lat: c.lat,
      lng: c.lng,
      state,
      visitCount: state === "saved" ? 0 : Math.max(1, it.visitCount),
      href: hrefOf(it),
    });
  }
  return { points, missing };
}

/** 라이브러리 key(s-<slug>) → 운영 Space 좌표. 공개 공간 전용 항목도 같은 slug의 운영 Space 좌표를 쓴다. */
export async function getLibraryCoords(items: LibraryItem[]): Promise<Map<string, Coord>> {
  const slugByKey = new Map<string, string>();
  for (const it of items) if (it.key.startsWith("s-")) slugByKey.set(it.key, it.key.slice(2));
  const out = new Map<string, Coord>();
  if (slugByKey.size === 0) return out;
  const rows = await prisma.space.findMany({
    where: { slug: { in: [...new Set(slugByKey.values())] }, lat: { not: null }, lng: { not: null } },
    select: { slug: true, lat: true, lng: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  for (const [key, slug] of slugByKey) {
    const r = bySlug.get(slug);
    if (r && isValidCoord(r.lat, r.lng)) out.set(key, { lat: r.lat as number, lng: r.lng as number });
  }
  return out;
}
