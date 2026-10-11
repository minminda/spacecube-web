/* ── 공간 등록 완성도 · 태그 정리 안내 — 순수 함수 ──────────────────────────
   검색 · 추천 · HOME 선반 품질은 공간 정보가 채워져 있고 태그 어휘가 정돈돼 있을 때 좋아진다.
   공개를 막지는 않는다(권고만). 새 필드를 만들지 않고 기존 필드로 판단한다 — "선정 이유"는 공간 소개(description)로 본다. ── */

export interface SpaceQualityInput {
  area: string;
  category: string;
  summary: string;
  mapUrl: string;
  description: string;
  tags: string[];
}

/** 비어 있는 권장 정보 이름들 */
export function missingSpaceInfo(v: SpaceQualityInput): string[] {
  const out: string[] = [];
  if (!v.area.trim()) out.push("지역");
  if (!v.category.trim()) out.push("유형");
  if (!v.summary.trim()) out.push("한 줄 소개");
  if (!v.mapUrl.trim()) out.push("지도 링크");
  if (v.tags.length === 0) out.push("태그");
  if (!v.description.trim()) out.push("공간 소개(선정 이유)");
  return out;
}

export const RECOMMENDED_TAGS = { min: 3, max: 5 } as const;

const norm = (s: string) => s.trim().replace(/\s+/g, "").toLowerCase();

export interface TagAdvice {
  /** 권장 개수(3~5개)를 벗어남 */
  count: "few" | "many" | null;
  /** 허용 태그 목록에 없는 태그(새 태그) */
  unknown: string[];
  /** 대소문자 · 공백만 다른 기존 태그가 있어 통일을 권하는 경우 [입력, 기존] */
  variants: [string, string][];
  /** 같은 태그를 두 번 쓴 경우 */
  duplicates: string[];
}

export function adviseTags(tags: string[], allowed: string[]): TagAdvice {
  const byNorm = new Map(allowed.map((a) => [norm(a), a]));
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const unknown: string[] = [];
  const variants: [string, string][] = [];
  for (const t of tags) {
    const n = norm(t);
    if (seen.has(n)) duplicates.push(t);
    seen.add(n);
    const known = byNorm.get(n);
    if (!known) unknown.push(t);
    else if (known !== t) variants.push([t, known]);
  }
  const count = tags.length === 0 ? null : tags.length < RECOMMENDED_TAGS.min ? "few" : tags.length > RECOMMENDED_TAGS.max ? "many" : null;
  return { count, unknown, variants, duplicates };
}
