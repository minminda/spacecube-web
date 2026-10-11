/* ── 테마 선반 ↔ 유형/태그 연결 규칙 — 순수 함수 ────────────────────────────
   테마 선반(책 · 음악 · 커피 …)은 공간의 유형(category) · 태그 · 이름에 키워드가 들어 있으면 모인다(shelves.ts matchesTheme).
   키워드 기본값은 코드(HOME_THEMES)이고, 운영자가 바꾼 값만 HomeShelf 행(key = "theme:<테마키>", description = 쉼표 구분 키워드)에 저장한다.
   행이 없으면 코드 기본값 → 설정 없이도 이전 HOME과 같다. 테마 목록 · 제목 · 매칭 방식은 코드가 정한다(운영자는 연결 키워드만). ── */

import { matchesTheme, type HomeSpace, type HomeTheme } from "./shelves";

export const THEME_RULE_PREFIX = "theme:";
export const MAX_THEME_KEYWORDS = 20;
const MAX_KEYWORD_LENGTH = 20;

export const themeRuleKey = (themeKey: string) => `${THEME_RULE_PREFIX}${themeKey}`;

/** 쉼표 · 줄바꿈으로 구분된 키워드 → 정리된 목록(공백 정리 · 대소문자 무시 중복 제거 · 길이 제한) */
export function parseKeywords(raw: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(raw) ? raw : (raw ?? "").split(/[,\n]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = String(p).trim().replace(/\s+/g, " ").slice(0, MAX_KEYWORD_LENGTH);
    const id = k.toLowerCase();
    if (!k || seen.has(id)) continue;
    seen.add(id);
    out.push(k);
    if (out.length >= MAX_THEME_KEYWORDS) break;
  }
  return out;
}

/** 저장된 규칙 행을 코드 기본 테마에 덮어쓴다. 알 수 없는 테마 · 빈 키워드 행은 무시(기본값 유지). */
export function applyThemeRules(themes: HomeTheme[], rows: { key: string; description: string | null }[]): HomeTheme[] {
  const byKey = new Map(rows.filter((r) => r.key.startsWith(THEME_RULE_PREFIX)).map((r) => [r.key.slice(THEME_RULE_PREFIX.length), r.description]));
  return themes.map((t) => {
    const custom = parseKeywords(byKey.get(t.key));
    return custom.length > 0 ? { ...t, keywords: custom } : t;
  });
}

export type ThemeStatus = "ok" | "short" | "none";

export interface ThemeDiagnosis {
  key: string;
  chip: string;
  title: string;
  keywords: string[];
  defaultKeywords: string[];
  customized: boolean;
  /** 지금 이 테마에 모이는 공개 공간 수 */
  count: number;
  /** HOME 선반이 생기는 최소 공간 수 */
  min: number;
  status: ThemeStatus;
  /** 모이는 공간 이름(최대 6) */
  sample: string[];
}

/** 테마별 현재 상태 — 공개 공간 수와 노출 가능 여부(min곳 이상이어야 선반이 생긴다). */
export function diagnoseThemes(themes: HomeTheme[], defaults: HomeTheme[], spaces: Pick<HomeSpace, "category" | "tags" | "name">[], min = 3): ThemeDiagnosis[] {
  const defaultsByKey = new Map(defaults.map((d) => [d.key, d]));
  return themes.map((t) => {
    const matched = spaces.filter((s) => matchesTheme(s, t));
    const def = defaultsByKey.get(t.key) ?? t;
    return {
      key: t.key, chip: t.chip, title: t.title, keywords: t.keywords, defaultKeywords: def.keywords,
      customized: JSON.stringify(t.keywords) !== JSON.stringify(def.keywords),
      count: matched.length, min,
      status: matched.length >= min ? "ok" : matched.length === 0 ? "none" : "short",
      sample: matched.slice(0, 6).map((s) => s.name),
    };
  });
}
