/* ── 지역 관리 — 순수 함수 ───────────────────────────────────────────────
   지역은 문자열(Space.district · EditorialSpace.area)이라 "연남"과 "연남동"이 따로 생기기 쉽다.
   관리자에서 새 지역을 만들거나 이름을 바꿀 때 normalizeArea 기준으로 같은 동네인지 검사한다. ── */

import { normalizeArea, sameArea } from "@/lib/editorial/area";

export interface RegionNameRow { id: string; name: string }

/** 지역명 입력 정리(앞뒤 공백 · 연속 공백). 빈 값이면 null. */
export function cleanRegionName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().replace(/\s+/g, " ");
  return v ? v : null;
}

/** 같은 동네로 보이는 기존 지역(자기 자신 제외). "연남동" 입력 시 "연남"이 있으면 그 행을 돌려준다. */
export function findRegionConflict(name: string, existing: RegionNameRow[], selfId?: string): RegionNameRow | null {
  return existing.find((r) => r.id !== selfId && (r.name === name || sameArea(r.name, name))) ?? null;
}

/** 지역 slug 자동 생성 — 영문/숫자면 그대로, 한글 등이면 충돌 없는 임시 코드. */
export function makeRegionSlug(name: string, takenSlugs: Set<string>): string {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = ascii || "region";
  if (!takenSlugs.has(base) && ascii) return base;
  for (let i = 1; i < 1000; i++) {
    const cand = `${base}-${i}`;
    if (!takenSlugs.has(cand)) return cand;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export interface UsedAreaValue { value: string; slug: string }

/** 이 지역(정규화 기준)을 쓰는 공간 수 — 같은 slug는 운영 공간 + 공간 등록 중복 집계를 피해 한 곳으로 센다. */
export function countSpacesInRegion(regionName: string, used: UsedAreaValue[]): number {
  const target = normalizeArea(regionName);
  if (!target) return 0;
  return new Set(used.filter((u) => normalizeArea(u.value) === target).map((u) => u.slug)).size;
}

export interface UnregisteredRegion { label: string; count: number; values: string[] }

/** 공간에는 쓰이지만 지역 목록에 없는 지역(정규화 기준으로 묶음). */
export function findUnregisteredRegions(used: UsedAreaValue[], regionNames: string[]): UnregisteredRegion[] {
  const known = new Set(regionNames.map((n) => normalizeArea(n)).filter((n): n is string => !!n));
  const groups = new Map<string, { slugs: Set<string>; values: Set<string> }>();
  for (const u of used) {
    const key = normalizeArea(u.value);
    if (!key || known.has(key)) continue;
    const g = groups.get(key) ?? { slugs: new Set<string>(), values: new Set<string>() };
    g.slugs.add(u.slug);
    g.values.add(u.value.trim());
    groups.set(key, g);
  }
  return [...groups].map(([label, g]) => ({ label, count: g.slugs.size, values: [...g.values] }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}
