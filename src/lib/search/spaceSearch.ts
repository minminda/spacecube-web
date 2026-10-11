/* ── 공간 · 지역 검색 랭킹 — 순수 함수 ─────────────────────────────────────────
   검색은 공간 이름만 찾는 기능이 아니다. 공간 하나에 붙은 말(이름 · 지역 · 유형 · 태그 · 한 줄 소개 · 큐레이션 · 설명)을 모두 보고,
   검색어와 얼마나 관련 있는지를 점수로 매겨 위에서부터 보여준다. 검색 서비스(Elasticsearch 등)는 쓰지 않는다 —
   지금 데이터 규모에서는 단순하고 설명할 수 있는 점수면 충분하다.

   점수(검색어 한 단어 기준, 필드마다 가장 높은 것):
     공간명 정확히 100 · 공간명 앞부분/단어 일치 80 · 지역 정확히 75 · 지역 단어 일치 60 · 유형 정확히 65 · 태그 정확히 60 · 테마(책 · 음악…) 50
     공간명 일부 45 · 유형 일부 40 · 지역 앞부분 40 · 태그 일부 35 · 큐레이션 제목/요약 30 · 한 줄 소개 · 선정 이유 20 · 상세 설명 10
   여러 단어("망원 LP")는 단어마다 점수를 더한다(AND로 걸러 내지 않는다 — 한 단어만 맞아도 결과에 남는다).
   모든 단어가 맞으면 +30, 한 단어가 여러 필드에 맞으면 필드마다 +3(최대 +12).
   한 글자 단어("책")는 이름 · 지역 · 유형 · 태그와 정확히 같을 때와 테마로만 맞는다(설명 속 우연한 글자로 잘못 묶이지 않게).
   "연남동"은 "연남"으로도 찾는다(기존 지역 이름 정리 normalizeArea와 같은 규칙). ── */

import { normalizeArea } from "@/lib/editorial/area";
import { HOME_THEMES, matchesTheme, type HomeTheme } from "@/lib/home/shelves";

export interface SearchDoc {
  id: string;
  name: string;
  /** 정규화된 지역명(연남동 → 연남) */
  area: string | null;
  category: string;
  tags: string[];
  /** 한 줄 소개 */
  summary: string;
  /** 상세 설명(문단 이어 붙임) */
  description: string;
  /** 이 공간이 담긴 발행된 큐레이션의 제목 · 요약 */
  curation: string[];
  /** 큐레이션에 적힌 공간별 선정 이유 */
  reasons: string[];
  /** 공개 순서(작을수록 먼저 소개됨) — 점수가 같을 때 최근 소개한 곳 먼저 */
  order: number;
}

export type SearchField = "name" | "area" | "category" | "tag" | "theme" | "curation" | "reason" | "description";

export interface TokenMatch {
  token: string;
  field: SearchField;
  kind: "exact" | "prefix" | "partial" | "theme";
  points: number;
}

export interface SearchHit<D extends SearchDoc = SearchDoc> {
  doc: D;
  score: number;
  /** 단어마다 가장 잘 맞은 필드 — 왜 이 결과인지 설명할 때 쓴다 */
  matched: TokenMatch[];
}

export const MAX_QUERY_TOKENS = 6;

/** 소문자 · 기호 제거 · 공백 정리. 한글 · 영문 · 숫자만 남긴다. */
export function normalizeText(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 검색어 → 단어(정리 · 중복 제거 · 최대 6개) */
export function queryTokens(raw: string): string[] {
  const tokens = normalizeText(raw).split(" ").filter(Boolean);
  return [...new Set(tokens)].slice(0, MAX_QUERY_TOKENS);
}

/** 한 단어의 검색 형태 — "연남동"이면 "연남"도 함께(지역 이름 규칙) */
function variantsOf(token: string): string[] {
  const m = token.match(/^([가-힣]{2,})동$/);
  return m ? [token, m[1]] : [token];
}

const words = (text: string) => (text ? text.split(" ") : []);

interface Prepared {
  doc: SearchDoc;
  name: string;
  area: string;
  category: string;
  tags: string[];
  curation: string;
  reasons: string;
  description: string;
}

function prepare(doc: SearchDoc): Prepared {
  return {
    doc,
    name: normalizeText(doc.name),
    area: doc.area ? normalizeText(doc.area) : "",
    category: normalizeText(doc.category),
    tags: doc.tags.map(normalizeText).filter(Boolean),
    curation: normalizeText(doc.curation.join(" ")),
    reasons: normalizeText([doc.summary, ...doc.reasons].join(" ")),
    description: normalizeText(doc.description),
  };
}

/** 이 단어가 말하는 테마 — 칩 이름 · 키워드와 정확히 같을 때 */
function themesFor(token: string, themes: HomeTheme[]): HomeTheme[] {
  return themes.filter((t) => normalizeText(t.chip) === token || t.keywords.some((k) => normalizeText(k) === token));
}

function scoreToken(p: Prepared, token: string, themes: HomeTheme[]): { best: TokenMatch; fields: number } | null {
  const single = token.length <= 1;
  const found = new Map<SearchField, TokenMatch>();
  const put = (field: SearchField, kind: TokenMatch["kind"], points: number) => {
    const cur = found.get(field);
    if (!cur || cur.points < points) found.set(field, { token, field, kind, points });
  };

  for (const v of variantsOf(token)) {
    // 공간명
    if (p.name === v) put("name", "exact", 100);
    else if (!single) {
      if (p.name.startsWith(v) || words(p.name).includes(v)) put("name", "prefix", 80);
      else if (p.name.includes(v)) put("name", "partial", 45);
    }
    // 지역 — 검색어도 지역 이름 규칙으로 맞춘다
    if (p.area) {
      const av = normalizeText(normalizeArea(v) ?? v);
      if (p.area === av) put("area", "exact", 75);
      else if (!single && words(p.area).includes(av)) put("area", "prefix", 60); // "용인 처인구"의 "처인구"
      else if (!single && p.area.startsWith(av)) put("area", "prefix", 40);
    }
    // 유형
    if (p.category) {
      if (p.category === v) put("category", "exact", 65);
      else if (!single) {
        if (words(p.category).includes(v)) put("category", "prefix", 55);
        else if (p.category.includes(v)) put("category", "partial", 40);
      }
    }
    // 태그
    for (const t of p.tags) {
      if (t === v) put("tag", "exact", 60);
      else if (!single && t.includes(v)) put("tag", "partial", 35);
    }
    // 큐레이션 · 소개 · 설명(두 글자 이상일 때만)
    if (!single) {
      if (p.curation.includes(v)) put("curation", "partial", 30);
      if (p.reasons.includes(v)) put("reason", "partial", 20);
      if (p.description.includes(v)) put("description", "partial", 10);
    }
  }

  // 테마("책" → 서점 · 책방 · 독립서점…) — 공간 데이터의 유형 · 태그 · 이름으로 판정(HOME 테마 선반과 같은 규칙)
  for (const theme of themesFor(token, themes)) {
    if (matchesTheme({ category: p.doc.category, tags: p.doc.tags, name: p.doc.name }, theme)) put("theme", "theme", 50);
  }

  if (found.size === 0) return null;
  const all = [...found.values()].sort((a, b) => b.points - a.points);
  return { best: all[0], fields: all.length };
}

/**
 * 관련도 순 공간 검색. 점수가 0인 공간은 빠진다. 점수가 같으면 최근에 소개한 공간 먼저, 그다음 이름 순.
 * themes는 테스트에서 바꿔 끼울 수 있다(기본은 HOME 테마).
 */
export function searchSpaces<D extends SearchDoc>(docs: D[], query: string, themes: HomeTheme[] = HOME_THEMES): SearchHit<D>[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];

  const hits: SearchHit<D>[] = [];
  for (const doc of docs) {
    const prepared = prepare(doc);
    const matched: TokenMatch[] = [];
    let score = 0;
    for (const token of tokens) {
      const r = scoreToken(prepared, token, themes);
      if (!r) continue;
      matched.push(r.best);
      score += r.best.points + Math.min(r.fields - 1, 4) * 3;
    }
    if (matched.length === 0) continue;
    if (tokens.length > 1 && matched.length === tokens.length) score += 30;
    hits.push({ doc, score, matched });
  }
  return hits.sort((a, b) => b.score - a.score || b.doc.order - a.doc.order || a.doc.name.localeCompare(b.doc.name, "ko"));
}

export interface RegionHit {
  area: string;
  /** 지역 이름과 정확히 같은 말로 찾았는가(아니면 앞부분만 맞음) */
  exact: boolean;
}

/**
 * 검색어에 맞는 지역 — 정확히 같은 지역을 먼저, 그다음 앞부분이 맞는 지역(두 글자 이상). 최대 3곳.
 * "망원 LP"처럼 단어가 여럿이어도 단어 하나가 지역 이름이면 그 지역이 나온다.
 */
export function searchRegions(areas: string[], query: string, limit = 3): RegionHit[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const exact: RegionHit[] = [];
  const prefix: RegionHit[] = [];
  for (const area of areas) {
    const a = normalizeText(area);
    if (!a) continue;
    let isExact = false;
    let isPrefix = false;
    for (const token of tokens) {
      for (const v of variantsOf(token)) {
        if (a === v) isExact = true;
        else if (v.length >= 2 && (a.startsWith(v) || words(a).includes(v))) isPrefix = true;
      }
    }
    if (isExact) exact.push({ area, exact: true });
    else if (isPrefix) prefix.push({ area, exact: false });
  }
  return [...exact, ...prefix].slice(0, limit);
}
