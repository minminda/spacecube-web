/* ── HOME 발견 선반(Shelf) 구성 — 순수 함수 ───────────────────────────────────
   HOME은 넷플릭스처럼 여러 "선반"을 아래로 이어 보여준다. 공간 하나는 여러 선반(지역 · 테마 · 추천 · 저장)에
   동시에 나올 수 있다 — 공간을 한 분류에 고정하지 않는다.
   이번 단계는 새 스키마 없이 기존 공개 공간 데이터(EditorialSpace의 area · category · tags)에서 선반을 만든다.
   지역 · 테마를 실제 데이터 구조(Region · Theme 테이블)로 옮길 때는 이 파일의 입력만 바꾸면 된다.
   별점 · 순위 · 퍼센트는 만들지 않는다. 선반 제목은 "왜 이 공간들인가"를 말한다. ── */

import type { ResolvedImage } from "@/lib/editorial/types";
import { normalizeArea } from "@/lib/editorial/area";

/** HOME 카드 한 장에 필요한 공간 정보 — 실제 공개 공간과 임시(fixture) 공간이 같은 모양을 쓴다. */
export interface HomeSpace {
  /** 공개 공간 id(임시 공간은 "fixture:…") */
  id: string;
  /** 상세 주소 slug — 임시 공간은 null(상세가 없으므로 카드가 링크가 아니다) */
  slug: string | null;
  name: string;
  /** 정규화된 지역명(연남동 → 연남) */
  area: string | null;
  category: string;
  tags: string[];
  summary?: string;
  image: ResolvedImage;
  /** 현장에 Cube가 있는 함께한 공간 */
  partner: boolean;
  /** 공개 순서(작을수록 먼저 소개됨) */
  order: number;
  /** UI 확인용 임시 공간 — src/lib/home/fixtures.ts에서만 만든다 */
  fixture?: boolean;
}

export interface HomeTheme {
  key: string;
  /** 선반 제목(테마 하나 = 큐레이션 선반 하나) */
  title: string;
  /** 지역을 고른 화면의 선반 제목 뒷부분 — "후암에서 책과 함께 보내는 곳" */
  short: string;
  /** 칩에 쓰는 한 단어 */
  chip: string;
  /** 공간의 유형 · 태그 · 이름에서 찾는 말 — 한 글자 말은 정확히 같을 때만 */
  keywords: string[];
}

/**
 * 테마 선반 — 지역과 별개로 공간을 발견하는 입구. 복잡한 필터가 아니라 선반 하나씩.
 * 키워드는 공간 데이터에 실제로 들어 있는 말(유형 · 태그 · 이름)과만 맞춘다(소개 문장은 보지 않는다 — 우연한 단어로 잘못 묶이지 않게).
 */
export const HOME_THEMES: HomeTheme[] = [
  { key: "book", chip: "책", short: "책과 함께 보내는 곳", title: "책과 함께 보내는 공간", keywords: ["책", "서점", "북", "도서", "독서", "book"] },
  { key: "music", chip: "음악", short: "음악을 만나는 곳", title: "음악을 들으러 가고 싶은 곳", keywords: ["음악", "lp", "레코드", "바이닐", "재즈", "청음", "music", "record"] },
  { key: "film", chip: "영화", short: "영화 같은 시간을 보내는 곳", title: "영화처럼 오래 기억에 남는 공간", keywords: ["영화", "시네마", "극장", "필름", "cinema", "film"] },
  { key: "coffee", chip: "커피", short: "커피가 좋은 곳", title: "커피 한 잔이 머무는 이유가 되는 곳", keywords: ["커피", "카페", "로스터리", "에스프레소", "coffee", "cafe"] },
  { key: "exhibition", chip: "전시", short: "전시를 보러 가는 곳", title: "전시를 보러 들르는 공간", keywords: ["전시", "갤러리", "미술", "아트", "gallery", "art"] },
  { key: "alone", chip: "혼자", short: "혼자 머물기 좋은 곳", title: "혼자 천천히 머물기 좋은 곳", keywords: ["혼자", "조용", "1인", "고요", "혼자서"] },
  { key: "talk", chip: "대화", short: "이야기하기 좋은 곳", title: "누군가와 오래 이야기하기 좋은 곳", keywords: ["대화", "모임", "이야기"] },
  { key: "evening", chip: "저녁", short: "저녁에 가기 좋은 곳", title: "저녁에 가기 좋은 공간", keywords: ["저녁", "밤", "바", "와인", "칵테일", "bar", "wine"] },
  { key: "shop", chip: "작은 숍", short: "들러 볼 작은 숍", title: "취향이 선명한 작은 숍", keywords: ["숍", "편집숍", "소품", "문구", "가게", "shop", "store"] },
];

/** HOME 지역 선택에서 먼저 보여 줄 지역(데이터가 없어도 이름은 보인다 — 준비 중으로) */
export const SUGGESTED_AREAS = ["망원", "연남", "후암", "서촌", "성수"];

const lower = (s: string) => s.trim().toLowerCase();

/** 공간이 테마에 속하는가 — 유형 · 태그 · 이름의 말과 키워드를 맞춘다(한 글자 키워드는 정확히 같을 때만). */
export function matchesTheme(space: Pick<HomeSpace, "category" | "tags" | "name">, theme: Pick<HomeTheme, "keywords">): boolean {
  const tokens = [space.category, ...space.tags].map(lower).filter(Boolean);
  const name = lower(space.name);
  return theme.keywords.some((raw) => {
    const kw = lower(raw);
    if (kw.length <= 1) return tokens.includes(kw);
    return tokens.some((t) => t.includes(kw)) || name.includes(kw);
  });
}

export interface ThemeShelf {
  theme: HomeTheme;
  spaces: HomeSpace[];
}

/** 테마 선반 — 공간이 min곳 이상 모이는 테마만, HOME_THEMES 순서대로. 공간은 공개 순서 역순(새로 소개한 곳 먼저). */
export function buildThemeShelves(spaces: HomeSpace[], opts: { min?: number; perShelf?: number; themes?: HomeTheme[] } = {}): ThemeShelf[] {
  const min = opts.min ?? 3;
  const per = opts.perShelf ?? 12;
  return (opts.themes ?? HOME_THEMES)
    .map((theme) => ({ theme, spaces: newestFirst(spaces.filter((s) => matchesTheme(s, theme))).slice(0, per) }))
    .filter((s) => s.spaces.length >= min);
}

export interface AreaShelf {
  area: string;
  spaces: HomeSpace[];
  /** 그 지역 공간 전체 수(선반에는 일부만) */
  total: number;
}

/** 지역 선반 — 공간이 min곳 이상인 지역, 많은 순(같으면 SUGGESTED_AREAS 순 → 가나다). */
export function buildAreaShelves(spaces: HomeSpace[], opts: { min?: number; max?: number; perShelf?: number } = {}): AreaShelf[] {
  const min = opts.min ?? 3;
  const per = opts.perShelf ?? 12;
  const byArea = new Map<string, HomeSpace[]>();
  for (const s of spaces) {
    if (!s.area) continue;
    byArea.set(s.area, [...(byArea.get(s.area) ?? []), s]);
  }
  return [...byArea]
    .filter(([, list]) => list.length >= min)
    .sort(([a, la], [b, lb]) => lb.length - la.length || suggestedRank(a) - suggestedRank(b) || a.localeCompare(b, "ko"))
    .slice(0, opts.max ?? 3)
    .map(([area, list]) => ({ area, spaces: newestFirst(list).slice(0, per), total: list.length }));
}

/** 같은 지역 안에서 유형(category)별 선반 — "후암의 카페" 같은 것. min곳 이상인 유형만, 많은 순. */
export function buildCategoryShelves(spaces: HomeSpace[], opts: { min?: number; max?: number } = {}): { category: string; spaces: HomeSpace[] }[] {
  const min = opts.min ?? 2;
  const byCat = new Map<string, HomeSpace[]>();
  for (const s of spaces) {
    const c = s.category.trim();
    if (c) byCat.set(c, [...(byCat.get(c) ?? []), s]);
  }
  return [...byCat]
    .filter(([, list]) => list.length >= min)
    .sort(([a, la], [b, lb]) => lb.length - la.length || a.localeCompare(b, "ko"))
    .slice(0, opts.max ?? 2)
    .map(([category, list]) => ({ category, spaces: newestFirst(list) }));
}

export function spacesInArea(spaces: HomeSpace[], area: string | null): HomeSpace[] {
  const target = normalizeArea(area);
  if (!target) return spaces;
  return spaces.filter((s) => s.area === target);
}

/** 새로 소개한 순(공개 순서 역순) */
export function newestFirst(spaces: HomeSpace[]): HomeSpace[] {
  return [...spaces].sort((a, b) => b.order - a.order);
}

function suggestedRank(area: string): number {
  const i = SUGGESTED_AREAS.indexOf(area);
  return i === -1 ? 99 : i;
}

export interface AreaOption {
  area: string;
  spaceCount: number;
  curationCount: number;
  suggested: boolean;
}

/**
 * 지역 선택 목록 — 추천 지역(SUGGESTED_AREAS)을 먼저, 그다음 실제로 등록된 다른 지역(공간 많은 순).
 * 추천 지역은 아직 데이터가 없어도 보인다(선택하면 "준비 중"으로 안내).
 */
export function buildAreaOptions(registered: { area: string; spaceCount: number; curationCount: number }[]): AreaOption[] {
  const map = new Map(registered.map((r) => [r.area, r]));
  const suggested = SUGGESTED_AREAS.map((area) => ({ area, spaceCount: map.get(area)?.spaceCount ?? 0, curationCount: map.get(area)?.curationCount ?? 0, suggested: true }));
  const others = registered
    .filter((r) => !SUGGESTED_AREAS.includes(r.area))
    .sort((a, b) => b.spaceCount - a.spaceCount || b.curationCount - a.curationCount || a.area.localeCompare(b.area, "ko"))
    .map((r) => ({ ...r, suggested: false }));
  return [...suggested, ...others];
}

/** 지역 선택 검색 — 이름에 검색어가 들어 있는 지역(공백 무시, "동" 생략 허용) */
export function filterAreaOptions(options: AreaOption[], query: string): AreaOption[] {
  const q = query.replace(/\s+/g, "").replace(/동$/, "");
  if (!q) return options;
  return options.filter((o) => o.area.replace(/\s+/g, "").includes(q));
}

/** HOME 주소 — 지역 · 미리보기 파라미터를 함께 유지한다 */
export function homeHref(params: { area?: string | null; preview?: string | null }): string {
  const p = new URLSearchParams();
  if (params.area) p.set("area", params.area);
  if (params.preview) p.set("preview", params.preview);
  const qs = p.toString();
  return qs ? `/?${qs}` : "/";
}
