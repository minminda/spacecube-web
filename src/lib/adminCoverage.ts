/* ── 관리자 Coverage Map — 순수 함수 ─────────────────────────────────────
   지역(District) ↔ 공간(Space.district) 연결은 FK가 아니라 문자열이라 normalizeArea 기준으로 비교한다
   ("연남" = "연남동"). 지역 관리 화면의 countSpacesInRegion과 같은 규칙. ── */

import { normalizeArea, sameArea } from "@/lib/editorial/area";

export interface CoverageRegion { id: string; name: string; lat: number | null; lng: number | null }
export interface CoverageSpace { district: string | null; lat: number | null; lng: number | null; status: "public" | "private" | "demo" }

export function hasCoord<T extends { lat: number | null; lng: number | null }>(p: T): p is T & { lat: number; lng: number } {
  return p.lat !== null && p.lng !== null;
}

/** 지역에 속한 공간(정규화 비교). */
export function spacesInRegion<S extends { district: string | null }>(regionName: string, spaces: S[]): S[] {
  return spaces.filter((s) => sameArea(s.district, regionName));
}

/** 필터 드롭다운용 지역 키 — 등록된 지역 + 공간에만 쓰이는 지역(정규화 라벨). */
export function regionOptions(regions: { name: string }[], spaces: { district: string | null }[]): string[] {
  const keys = new Set<string>();
  for (const r of regions) { const k = normalizeArea(r.name); if (k) keys.add(k); }
  for (const s of spaces) { const k = normalizeArea(s.district); if (k) keys.add(k); }
  return [...keys].sort((a, b) => a.localeCompare(b, "ko"));
}

export interface CoveragePoint { lat: number; lng: number }

/** 표시할 좌표가 하나뿐이거나 모두 같은 곳이면 bounds로 맞추면 과하게 확대되므로 따로 처리하기 위한 판정. */
export function isSinglePoint(points: CoveragePoint[]): boolean {
  if (points.length === 0) return false;
  return points.every((p) => Math.abs(p.lat - points[0].lat) < 1e-5 && Math.abs(p.lng - points[0].lng) < 1e-5);
}
