/* ── 공간 찾기(Space Finder) — 찾기 자체가 개인화 추천이다 ─────────────────────────
   지역 선택 → 검색·필터로 후보 축소 → 개인 취향으로 정렬. 추천은 별도 단계가 아니라 정렬 순서다.
   - 후보는 몇 곳만 고르지 않고 조건에 맞는 공간 전부(Pool)를 보여준다.
   - 정렬 1순위: 개인 점수(기존 발견 추천 프로필 — 방문·저장·아카이브·직접 고른 태그 — 의 겹치는 속성 가중치 합,
     큐레이터 미리보기에서는 취향이 맞는 큐레이터가 고른 공간에 작은 가산점).
   - 정렬 2순위(신규 사용자에게는 사실상 기본 순서): 공간큐브 공식 큐레이션·큐레이터 컬렉션에 담긴 정도.
   - 정렬 3순위: 공개 순서.
   이유 문구는 실제로 겹친 속성·포함된 컬렉션으로만 만든다. 순수 함수 — Prisma 의존 없음(spaceFinder.test.ts). ── */

import { normalizeArea } from "@/lib/editorial/area";
import { attrKey, type TasteProfile } from "@/lib/discoveryRecommend";

/** 분위기 — 기존 공통 태그 이름 중심. 같은 뜻의 다른 표기(가상 공간의 "감각적인")도 함께 맞춘다. */
export const FINDER_MOODS = [
  { key: "조용한", match: ["조용한"] },
  { key: "감각 있는", match: ["감각있는", "감각적인"] },
  { key: "편안한", match: ["편안한"] },
  { key: "독특한", match: ["독특한"] },
  { key: "집중되는", match: ["집중되는"] },
] as const;

/** 유형·목적 — 공간 유형·태그·컬렉션 키워드에서 부분 일치("독립서점"은 "서점"으로 책에 맞음). */
export const FINDER_PURPOSES = [
  { key: "카페", match: ["카페"] },
  { key: "책", match: ["책", "서점", "북"] },
  { key: "음악", match: ["음악", "lp"] },
  { key: "전시", match: ["전시", "갤러리"] },
  { key: "데이트", match: ["데이트", "둘이"] },
  { key: "혼자", match: ["혼자"] },
  { key: "작업", match: ["작업"] },
] as const;

export interface FinderCollectionRef {
  title: string;
  slug: string;
  curatorSlug: string;
  curatorName: string;
  curatorIsOfficial: boolean;
  keywords: string[];
}

export interface FinderCandidate {
  id: string;
  name: string;
  area: string;
  category: string;
  tags?: string[];
  /** 공개 순서(작을수록 먼저) */
  order: number;
  /** 큐레이터 컬렉션(미리보기 권한이 있을 때만 채워진다) */
  collections: FinderCollectionRef[];
  /** 공간큐브 공식 큐레이션(발행된 것) */
  curations: { title: string; slug: string }[];
}

export interface FinderQuery {
  area: string | null;
  q: string;
  moods: string[];
  purposes: string[];
}

const list = (v?: string | string[]) => (Array.isArray(v) ? v : v ? v.split(",") : []).map((x) => x.trim()).filter(Boolean);

/** URL 쿼리 → 조건. 예전 링크의 feel(분위기)·for(목적) 이름을 그대로 받는다. 목록 밖 값은 버린다. */
export function parseFinderQuery(raw: { area?: string; q?: string; feel?: string | string[]; for?: string | string[] }): FinderQuery {
  const moodOf = (m: string) => FINDER_MOODS.find((x) => x.key === m || (x.match as readonly string[]).includes(attrKey(m)))?.key;
  return {
    area: normalizeArea(raw.area),
    q: (raw.q ?? "").trim().slice(0, 40),
    moods: [...new Set(list(raw.feel).map(moodOf).filter((m): m is (typeof FINDER_MOODS)[number]["key"] => !!m))].slice(0, 3),
    purposes: [...new Set(list(raw.for))].filter((p) => FINDER_PURPOSES.some((x) => x.key === p)).slice(0, 3),
  };
}

/** 공간 특징 + 담긴 컬렉션 키워드(큐레이터가 붙인 상황·목적). */
export function candidateAttrs(c: FinderCandidate): string[] {
  return [c.category, ...(c.tags ?? []), ...c.collections.flatMap((k) => k.keywords)].map((a) => a.trim()).filter(Boolean);
}

function moodMatches(label: string, attrs: string[]): boolean {
  const def = FINDER_MOODS.find((m) => m.key === label);
  const keys = attrs.map(attrKey);
  return !!def && def.match.some((m) => keys.includes(m));
}

function purposeMatches(label: string, attrs: string[]): boolean {
  const def = FINDER_PURPOSES.find((p) => p.key === label);
  const keys = attrs.map(attrKey);
  return !!def && keys.some((k) => def.match.some((m) => k.includes(m)));
}

function searchHaystack(c: FinderCandidate): string {
  return attrKey([
    c.name, c.area, c.category, ...(c.tags ?? []),
    ...c.collections.flatMap((k) => [k.title, k.curatorName, ...k.keywords]),
    ...c.curations.map((k) => k.title),
  ].join(" "));
}

/** 검색어 — 띄어쓰기로 나눈 낱말이 모두 맞아야 한다(이름·지역·유형·태그·컬렉션·큐레이터, 분위기·목적 이름도 이해). */
function matchesSearch(c: FinderCandidate, q: string): boolean {
  const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = searchHaystack(c);
  const attrs = candidateAttrs(c);
  return tokens.every((t) => {
    const key = attrKey(t);
    if (!key) return true;
    if (hay.includes(key)) return true;
    const mood = FINDER_MOODS.find((m) => m.key === t || (m.match as readonly string[]).includes(key));
    if (mood && moodMatches(mood.key, attrs)) return true;
    const purpose = FINDER_PURPOSES.find((p) => p.key === t);
    return !!purpose && purposeMatches(purpose.key, attrs);
  });
}

/** 필터 = 후보 축소. 지역 · 검색 · 분위기(모두) · 유형/목적(모두). */
export function filterCandidates<C extends FinderCandidate>(cands: C[], q: FinderQuery): C[] {
  return cands.filter((c) => {
    if (q.area && normalizeArea(c.area) !== q.area) return false;
    const attrs = candidateAttrs(c);
    if (!q.moods.every((m) => moodMatches(m, attrs))) return false;
    if (!q.purposes.every((p) => purposeMatches(p, attrs))) return false;
    return matchesSearch(c, q.q);
  });
}

export interface RankedCandidate<C extends FinderCandidate> {
  space: C;
  /** 개인 점수(취향 겹침 + 큐레이터 가산) — 0이면 개인화 근거 없음 */
  personal: number;
  /** 기본 순서 점수(공식 큐레이션 1 + 큐레이터 컬렉션 0.5씩) */
  base: number;
  /** 실제로 겹친 내 취향 속성(가중치 높은 순, 표시 이름) */
  matched: string[];
  /** 취향이 맞는 큐레이터가 고른 컬렉션 */
  affineCollections: FinderCollectionRef[];
}

/**
 * 개인화 정렬. profile이 없거나 비어 있으면 개인 점수는 모두 0 → 기본 순서(큐레이션·컬렉션 포함 정도 → 공개 순서).
 * curatorBoost: 큐레이터 slug → 가산점(취향 겹침 단계에서 계산, 미리보기 전용).
 */
export function rankCandidates<C extends FinderCandidate>(cands: C[], profile: TasteProfile | null, curatorBoost: Map<string, number> = new Map()): RankedCandidate<C>[] {
  const ranked = cands.map((space) => {
    const seen = new Set<string>();
    const hits: { label: string; w: number }[] = [];
    for (const a of candidateAttrs(space)) {
      const k = attrKey(a);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const w = profile?.weights.get(k) ?? 0;
      if (w > 0) hits.push({ label: profile?.labels.get(k) ?? a, w });
    }
    hits.sort((x, y) => y.w - x.w);
    const affineCollections = space.collections.filter((k) => (curatorBoost.get(k.curatorSlug) ?? 0) > 0);
    const boost = [...new Set(affineCollections.map((k) => k.curatorSlug))].reduce((s, slug) => s + (curatorBoost.get(slug) ?? 0), 0);
    return {
      space,
      personal: hits.reduce((s, h) => s + h.w, 0) + boost,
      base: space.curations.length + space.collections.length * 0.5,
      matched: hits.map((h) => h.label),
      affineCollections,
    };
  });
  return ranked.sort((a, b) => b.personal - a.personal || b.base - a.base || a.space.order - b.space.order);
}

/** 개인화 이유 — 실제로 겹친 속성이 있을 때만. */
/** 추천 이유 — 실제로 겹치는 특징이 있을 때만, 태그를 나열하지 않고 한 문장으로(취향은 숫자·태그로 설명하지 않는다). */
export function personalReason(matched: string[]): string | null {
  if (matched.length === 0) return null;
  return "내 공간들과 비슷한 결";
}

/**
 * 추천 카드의 이유 한 줄 — 하나만 고른다: 다녀온 곳 > 내 취향과 겹침 > 공간큐브 큐레이션 > 큐레이터 컬렉션.
 * 카드에는 태그·유형을 나열하지 않는다(상세에서). 근거가 없으면 null(빈 문장을 만들지 않는다).
 */
export function cardReason(input: {
  visited: boolean;
  personalized: boolean;
  matched: string[];
  curationTitle?: string | null;
  collection?: { curator: string; title: string } | null;
}): string | null {
  if (input.visited) return "다녀온 공간";
  const personal = input.personalized ? personalReason(input.matched) : null;
  if (personal) return personal;
  if (input.curationTitle) return `큐레이션 ‘${input.curationTitle}’`;
  if (input.collection) return `${input.collection.curator}의 ‘${input.collection.title}’`;
  return null;
}
