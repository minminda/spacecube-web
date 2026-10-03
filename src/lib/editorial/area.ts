/* ── 지역명 정규화 ───────────────────────────────────────────────────────
   공간 콘텐츠·큐레이션의 area는 자유 입력이라 "연남"과 "연남동"이 섞여 있다. CURATION 허브와 지역별
   추천은 지역이 기본 축이므로, 같은 동네를 하나로 묶기 위해 표시용 이름을 하나로 맞춘다.
   DB 값은 바꾸지 않는다(읽을 때만 정규화). ── */

/** "연남동" → "연남", " 망원동 " → "망원", "용인 처인구" → "용인 처인구". 빈 값은 null. */
export function normalizeArea(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const label = raw.trim().replace(/\s+/g, " ");
  if (!label) return null;
  // 마지막 단어가 "OO동"(한글 2자 이상 + 동)이면 "동"을 뗀다 — 동네 이름을 짧게 부르는 관례.
  const m = label.match(/^(.*?)([가-힣]{2,})동$/);
  if (m) return `${m[1]}${m[2]}`;
  return label;
}

export function sameArea(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeArea(a);
  return na !== null && na === normalizeArea(b);
}
