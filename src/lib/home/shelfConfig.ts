/* ── HOME 선반 설정 — 순수 함수 ────────────────────────────────────────────
   선반은 세 종류다.
   - SYSTEM: 규칙으로 자동 생성(새 소개 · 지역 · 테마 · CURATION · STORY · 함께한 공간).
   - PERSONALIZED: 사용자 데이터에 따라 달라짐(엄선 · 관심 지역 · 비슷한 사람 · 찜 · 다시 떠올려볼 공간 · 비슷한 사람 줄).
   - EDITORIAL: 운영자가 직접 만든 선반(DB: HomeShelf + HomeShelfSpace).
   운영자가 조절하는 것은 노출 · 순서 · (일부) 제목뿐이다. SYSTEM / PERSONALIZED의 내용은 운영자가 지정하지 않는다.
   설정 행이 없으면 아래 레지스트리의 기본값(노출 · 기본 순서 · 기본 제목)이 그대로 쓰인다. ── */

export type HomeShelfKindValue = "SYSTEM" | "PERSONALIZED" | "EDITORIAL";

export interface BuiltinShelf {
  key: string;
  kind: Exclude<HomeShelfKindValue, "EDITORIAL">;
  /** 관리자 목록 이름 */
  label: string;
  /** 코드가 만드는 제목(관리자에게 보여 주는 기본값) */
  defaultTitle: string;
  /** 제목을 운영자가 바꿀 수 있는가 — 지역 · 테마처럼 선반마다 제목이 규칙으로 만들어지면 false(제품 고정) */
  titleEditable: boolean;
  /** 이 선반이 무엇을 보여 주는지(관리자용 한 줄) */
  hint: string;
}

/** 기본 순서 = 배열 순서. 현재 HOME 구성과 같다. */
export const BUILTIN_SHELVES: BuiltinShelf[] = [
  { key: "for-you", kind: "PERSONALIZED", label: "엄선한 공간", defaultTitle: "회원님을 위해 엄선한 공간", titleEditable: true, hint: "저장 · 방문 기록으로 개인 정렬(비로그인은 큐레이션 순)" },
  { key: "interest", kind: "PERSONALIZED", label: "관심 지역", defaultTitle: "관심 지역에서 발견한 공간", titleEditable: true, hint: "별표한 지역의 아직 안 가본 공간" },
  { key: "similar", kind: "PERSONALIZED", label: "비슷한 사람들", defaultTitle: "나와 비슷한 사람들이 좋아한 공간", titleEditable: true, hint: "취향이 비슷한 사용자가 고른 공간" },
  { key: "saved", kind: "PERSONALIZED", label: "찜한 공간", defaultTitle: "내가 찜한 공간", titleEditable: true, hint: "내가 저장한 공간(비로그인은 로그인 안내)" },
  { key: "new", kind: "SYSTEM", label: "새로 소개", defaultTitle: "새롭게 소개한 공간", titleEditable: true, hint: "최근 공개한 공간 순" },
  { key: "area", kind: "SYSTEM", label: "지역 선반", defaultTitle: "{지역}에서 머물고 싶은 곳", titleEditable: false, hint: "공간이 3곳 이상인 지역마다 자동 생성(지역 화면에서는 유형 선반)" },
  { key: "curation", kind: "SYSTEM", label: "CURATION", defaultTitle: "최근 올라온 CURATION", titleEditable: true, hint: "발행된 큐레이션 최신순" },
  { key: "theme", kind: "SYSTEM", label: "테마 선반", defaultTitle: "{테마} (책 · 음악 · 영화 …)", titleEditable: false, hint: "공간의 유형 · 태그와 맞는 테마마다 자동 생성" },
  { key: "story", kind: "SYSTEM", label: "STORY", defaultTitle: "새로운 STORY", titleEditable: true, hint: "발행된 PEOPLE · THOUGHT 최신순" },
  { key: "revisit", kind: "PERSONALIZED", label: "다시 떠올려볼 공간", defaultTitle: "다시 떠올려볼 공간", titleEditable: true, hint: "내가 다녀온 공간" },
  { key: "cube", kind: "SYSTEM", label: "함께한 공간", defaultTitle: "공간큐브와 함께한 공간", titleEditable: true, hint: "현장에 Cube가 있는 공간" },
  { key: "similar-people", kind: "PERSONALIZED", label: "취향이 비슷한 사람", defaultTitle: "취향이 비슷한 사람", titleEditable: false, hint: "사람 줄(이름 · 아바타) — 제목은 고정" },
];

export const EDITORIAL_KEY_PREFIX = "ed:";
export const BUILTIN_KEYS = new Set(BUILTIN_SHELVES.map((s) => s.key));

/** DB 행 중 계획에 필요한 부분 */
export interface ShelfRow {
  id: string;
  key: string;
  kind: HomeShelfKindValue;
  title: string | null;
  description: string | null;
  visible: boolean;
  order: number;
}

export interface PlanItem {
  key: string;
  kind: HomeShelfKindValue;
  label: string;
  hint: string;
  /** 설정이 만든 제목(없으면 null → 코드 기본 제목) */
  titleOverride: string | null;
  defaultTitle: string;
  titleEditable: boolean;
  visible: boolean;
  order: number;
  /** EDITORIAL 선반의 id */
  editorialId?: string;
  description?: string | null;
}

export function cleanTitle(t: string | null | undefined): string | null {
  const s = (t ?? "").trim().replace(/\s+/g, " ");
  return s ? s.slice(0, 60) : null;
}

/**
 * 레지스트리 + 설정 행 → 노출 계획(순서대로). 기본 순서는 10, 20, … 이고 설정된 order가 있으면 그것을 쓴다.
 * 같은 order면 기본 순서(레지스트리 순 → EDITORIAL은 만든 순)로 안정 정렬한다. 레지스트리에 없는 SYSTEM/PERSONALIZED 행은 무시한다.
 */
export function buildShelfPlan(rows: ShelfRow[]): PlanItem[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const items: PlanItem[] = BUILTIN_SHELVES.map((b, i) => {
    const row = byKey.get(b.key);
    return {
      key: b.key, kind: b.kind, label: b.label, hint: b.hint, defaultTitle: b.defaultTitle, titleEditable: b.titleEditable,
      titleOverride: b.titleEditable ? cleanTitle(row?.title) : null,
      visible: row ? row.visible : true,
      order: row ? row.order : (i + 1) * 10,
    };
  });
  for (const r of rows.filter((x) => x.kind === "EDITORIAL")) {
    items.push({
      key: r.key, kind: "EDITORIAL", label: cleanTitle(r.title) ?? "(제목 없음)", hint: "운영자가 직접 고른 공간", defaultTitle: cleanTitle(r.title) ?? "",
      titleEditable: true, titleOverride: cleanTitle(r.title), visible: r.visible, order: r.order, editorialId: r.id, description: r.description,
    });
  }
  return items.map((it, idx) => ({ it, idx })).sort((a, b) => a.it.order - b.it.order || a.idx - b.idx).map((x) => x.it);
}

/** 다음 EDITORIAL 선반의 order — 현재 가장 뒤 */
export function nextShelfOrder(rows: { order: number }[]): number {
  return Math.max(BUILTIN_SHELVES.length * 10, ...rows.map((r) => r.order)) + 10;
}

export interface ShelfSettingInput {
  key: string;
  visible: boolean;
  title: string | null;
}

/** 저장 요청(순서 = 배열 순서) 검증 — 알 수 없는 키 · 중복 · 비어 있는 EDITORIAL 제목을 거른다. */
export function parseShelfSettings(raw: unknown, editorialKeys: Set<string>): { ok: true; items: ShelfSettingInput[] } | { ok: false; error: string } {
  const list = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: "저장할 선반이 없어요." };
  const seen = new Set<string>();
  const items: ShelfSettingInput[] = [];
  for (const r of list) {
    const o = r as { key?: unknown; visible?: unknown; title?: unknown };
    if (typeof o?.key !== "string" || typeof o.visible !== "boolean") return { ok: false, error: "잘못된 요청이에요." };
    if (seen.has(o.key)) return { ok: false, error: "같은 선반이 두 번 들어 있어요." };
    if (!BUILTIN_KEYS.has(o.key) && !editorialKeys.has(o.key)) return { ok: false, error: "알 수 없는 선반이에요. 새로고침해주세요." };
    seen.add(o.key);
    const title = typeof o.title === "string" ? cleanTitle(o.title) : null;
    if (editorialKeys.has(o.key) && !title) return { ok: false, error: "편집 선반에는 제목이 필요해요." };
    items.push({ key: o.key, visible: o.visible, title });
  }
  return { ok: true, items };
}

export interface EditorialShelfInput {
  title: string;
  description: string | null;
  visible: boolean;
  spaces: { spaceId: string; note: string | null }[];
}

export function parseEditorialShelf(raw: unknown): { ok: true; data: EditorialShelfInput } | { ok: false; error: string } {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return { ok: false, error: "잘못된 요청이에요." };
  const title = cleanTitle(typeof o.title === "string" ? o.title : null);
  if (!title) return { ok: false, error: "선반 제목을 입력해주세요." };
  const description = typeof o.description === "string" && o.description.trim() ? o.description.trim().slice(0, 200) : null;
  const spacesRaw = Array.isArray(o.spaces) ? o.spaces : [];
  if (spacesRaw.length > 30) return { ok: false, error: "한 선반에는 공간을 30곳까지 담을 수 있어요." };
  const seen = new Set<string>();
  const spaces: EditorialShelfInput["spaces"] = [];
  for (const s of spacesRaw) {
    const x = s as { spaceId?: unknown; note?: unknown };
    if (typeof x?.spaceId !== "string" || !x.spaceId) return { ok: false, error: "잘못된 공간이에요." };
    if (seen.has(x.spaceId)) continue;
    seen.add(x.spaceId);
    spaces.push({ spaceId: x.spaceId, note: typeof x.note === "string" && x.note.trim() ? x.note.trim().slice(0, 120) : null });
  }
  return { ok: true, data: { title, description, visible: o.visible !== false, spaces } };
}
