/* ── HOME 선반 진단 — 순수 함수 ─────────────────────────────────────────────
   "왜 이 선반이 HOME에 안 나오지?"를 코드 확인 없이 알 수 있게, 선반마다 지금 상태와 사유를 한 줄로 만든다.
   조건은 homeData.ts가 선반을 만드는 규칙(최소 공간 수 · 콘텐츠 유무)과 같다. ── */

export type DiagTone = "ok" | "warn" | "off" | "info";

export interface ShelfDiagnosis {
  tone: DiagTone;
  label: string;
  detail?: string;
}

export interface ShelfStats {
  /** 공개 Pool의 공간 수(초안 · 보관 · 데모 제외) */
  publicSpaces: number;
  /** 공간이 3곳 이상이라 지역 선반이 생기는 지역 수 */
  areaShelves: number;
  curations: number;
  stories: number;
  partnerSpaces: number;
  /** 테마 중 선반이 생기는 수 / 전체 */
  themeOk: number;
  themeTotal: number;
  /** EDITORIAL 선반별 공개 공간 수(key → n) */
  editorialCounts: Record<string, number>;
}

export const MIN_SHELF_SPACES = 3;

export function diagnoseShelf(item: { key: string; kind: "SYSTEM" | "PERSONALIZED" | "EDITORIAL"; visible: boolean }, s: ShelfStats): ShelfDiagnosis {
  if (!item.visible) return { tone: "off", label: "관리자 숨김", detail: "노출을 켜면 HOME에 나와요" };
  const enough = (n: number): ShelfDiagnosis =>
    n >= MIN_SHELF_SPACES
      ? { tone: "ok", label: "노출 중", detail: `공개 공간 ${n}곳` }
      : { tone: "warn", label: "공간 수 부족", detail: `공간 ${n} / 최소 ${MIN_SHELF_SPACES} — 부족해서 숨김` };
  const has = (n: number, what: string): ShelfDiagnosis =>
    n > 0 ? { tone: "ok", label: "노출 중", detail: `${what} ${n}개` } : { tone: "warn", label: "해당 콘텐츠 없음", detail: `발행된 ${what}가 없어 '준비 중' 안내만 보여요` };

  switch (item.key) {
    case "new": return enough(s.publicSpaces);
    case "area":
      return s.areaShelves > 0
        ? { tone: "ok", label: "노출 중", detail: `공간 3곳 이상인 지역 ${s.areaShelves}개` }
        : { tone: "warn", label: "해당 공간 없음", detail: "공간이 3곳 이상인 지역이 없어 숨김" };
    case "theme":
      return s.themeOk > 0
        ? { tone: "ok", label: "노출 중", detail: `테마 ${s.themeTotal}개 중 ${s.themeOk}개 노출 — 아래 '테마 선반 연결'에서 확인` }
        : { tone: "warn", label: s.publicSpaces === 0 ? "해당 공간 없음" : "공간 수 부족", detail: "공간 3곳 이상 모이는 테마가 없어 숨김" };
    case "curation": return has(s.curations, "CURATION");
    case "story": return has(s.stories, "STORY");
    case "cube":
      return s.partnerSpaces > 0
        ? { tone: "ok", label: "노출 중", detail: `함께한 공간 ${s.partnerSpaces}곳` }
        : { tone: "warn", label: "해당 공간 없음", detail: "Cube가 있는 공개 공간이 없어 숨김" };
    case "for-you":
      return s.publicSpaces > 0
        ? { tone: "ok", label: "노출 중", detail: "로그인 + 취향 데이터가 있으면 개인 정렬, 없으면 큐레이션 순" }
        : { tone: "warn", label: "해당 공간 없음" };
    case "interest": return { tone: "info", label: "개인화 데이터 필요", detail: "관심 지역(별표)을 저장한 사용자에게만" };
    case "similar": return { tone: "info", label: "개인화 데이터 필요", detail: "로그인 + 취향 데이터 + 비슷한 사용자가 있을 때만" };
    case "similar-people": return { tone: "info", label: "개인화 데이터 필요", detail: "비슷한 사용자가 2명 이상일 때만" };
    case "saved": return { tone: "info", label: "로그인 사용자 전용", detail: "사용자 데이터에 따라 노출(비로그인은 로그인 안내)" };
    case "revisit": return { tone: "info", label: "로그인 사용자 전용", detail: "다녀온 공간이 있을 때만" };
  }
  if (item.kind === "EDITORIAL") {
    const n = s.editorialCounts[item.key] ?? 0;
    return n > 0
      ? { tone: "ok", label: "노출 중", detail: `공개 공간 ${n}곳` }
      : { tone: "warn", label: "해당 공간 없음", detail: "공개된 공간이 없어 HOME에는 안 보여요" };
  }
  return { tone: "ok", label: "노출 중" };
}
