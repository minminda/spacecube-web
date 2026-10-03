/* ── 빠른 공간 찾기(큐레이터 프로토타입) ──────────────────────────────────────
   "오늘 연남에서 조용하고 혼자 있기 좋은 곳" — 지역 + 느낌 + 목적을 1~3번 골라 바로 후보를 줄인다.
   후보는 큐레이터가 컬렉션에 담은 공간만(취향 있는 사람이 먼저 걸러낸 곳). 조건은 공간 자체의 특징
   (공간 유형·태그)과, 그 공간을 담은 컬렉션의 키워드(큐레이터가 붙인 상황·목적) 둘 다로 맞춘다.
   설명은 실제로 맞은 조건·추천한 큐레이터·큐레이터 코멘트로만 만든다(지어낸 문장·가짜 % 없음).
   순수 함수 — Prisma 의존 없음(finder.test.ts). ── */

import { normalizeArea } from "@/lib/editorial/area";
import { attrKey } from "@/lib/discoveryRecommend";

export const FINDER_FEELS = ["조용한", "감각적인", "독특한", "편안한"] as const;

/** 목적 — 표시 이름과, 공간 특징·컬렉션 키워드에서 찾을 단어(부분 일치: "독립서점"은 "서점"으로 책에 맞음). */
export const FINDER_PURPOSES = [
  { key: "카페", match: ["카페"] },
  { key: "음악", match: ["음악", "lp"] },
  { key: "책", match: ["책", "서점", "북"] },
  { key: "데이트", match: ["데이트", "둘이"] },
  { key: "혼자", match: ["혼자"] },
  { key: "오래 머무는", match: ["오래머무는"] },
] as const;

export type FinderFeel = (typeof FINDER_FEELS)[number];
export type FinderPurpose = (typeof FINDER_PURPOSES)[number]["key"];

export interface FinderSpace {
  id: string;
  name: string;
  area: string;
  category: string;
  tags?: string[];
}

export interface FinderPick {
  spaceId: string;
  curatorSlug: string;
  curatorName: string;
  curatorIsOfficial?: boolean;
  collectionSlug: string;
  collectionTitle: string;
  keywords: string[];
  comment: string | null;
}

export interface FinderQuery {
  area: string | null;
  feels: string[];
  purposes: string[];
}

export interface MatchedCriterion {
  label: string;
  /** space: 공간 특징으로 맞음 / collection: 큐레이터 컬렉션 키워드로 맞음 */
  via: "space" | "collection";
  collectionTitle?: string;
  curatorName?: string;
}

export interface FinderResult<S extends FinderSpace> {
  space: S;
  matched: MatchedCriterion[];
  allMatched: boolean;
  curators: { slug: string; name: string; isOfficial?: boolean }[];
  /** 대표 코멘트 — 맞은 조건을 담은 컬렉션의 코멘트를 먼저 */
  comment: { text: string; curatorName: string; curatorIsOfficial?: boolean; collectionTitle: string } | null;
}

/** URL 쿼리 → 검증된 조건(목록에 없는 값은 버린다). */
export function parseFinderQuery(raw: { area?: string; feel?: string | string[]; for?: string | string[] }): FinderQuery {
  const list = (v?: string | string[]) => (Array.isArray(v) ? v : v ? v.split(",") : []).map((x) => x.trim()).filter(Boolean);
  return {
    area: normalizeArea(raw.area),
    feels: [...new Set(list(raw.feel))].filter((f) => (FINDER_FEELS as readonly string[]).includes(f)).slice(0, 2),
    purposes: [...new Set(list(raw.for))].filter((p) => FINDER_PURPOSES.some((x) => x.key === p)).slice(0, 2),
  };
}

function criterionMatches(label: string, kind: "feel" | "purpose", attrs: string[]): boolean {
  const keys = attrs.map(attrKey);
  if (kind === "feel") return keys.includes(attrKey(label));
  const def = FINDER_PURPOSES.find((p) => p.key === label);
  return !!def && keys.some((k) => def.match.some((m) => k.includes(m)));
}

export function runFinder<S extends FinderSpace>(spaces: S[], picks: FinderPick[], q: FinderQuery): FinderResult<S>[] {
  const picksBySpace = new Map<string, FinderPick[]>();
  for (const p of picks) picksBySpace.set(p.spaceId, [...(picksBySpace.get(p.spaceId) ?? []), p]);
  const criteria = [...q.feels.map((label) => ({ label, kind: "feel" as const })), ...q.purposes.map((label) => ({ label, kind: "purpose" as const }))];

  const results: FinderResult<S>[] = [];
  for (const space of spaces) {
    const sp = picksBySpace.get(space.id);
    if (!sp || sp.length === 0) continue; // 큐레이터가 고른 공간만
    if (q.area && normalizeArea(space.area) !== q.area) continue;

    const own = [space.category, ...(space.tags ?? [])];
    const matched: MatchedCriterion[] = [];
    for (const c of criteria) {
      if (criterionMatches(c.label, c.kind, own)) {
        matched.push({ label: c.label, via: "space" });
        continue;
      }
      const viaPick = sp.find((p) => criterionMatches(c.label, c.kind, p.keywords));
      if (viaPick) matched.push({ label: c.label, via: "collection", collectionTitle: viaPick.collectionTitle, curatorName: viaPick.curatorName });
    }
    if (criteria.length > 0 && matched.length === 0) continue;

    const curators = [...new Map(sp.map((p) => [p.curatorSlug, { slug: p.curatorSlug, name: p.curatorName, isOfficial: p.curatorIsOfficial }])).values()];
    const matchedTitles = new Set(matched.flatMap((m) => (m.collectionTitle ? [m.collectionTitle] : [])));
    const withComment = [...sp].sort((a, b) => Number(matchedTitles.has(b.collectionTitle)) - Number(matchedTitles.has(a.collectionTitle))).find((p) => p.comment);
    results.push({
      space,
      matched,
      allMatched: matched.length === criteria.length,
      curators,
      comment: withComment?.comment
        ? { text: withComment.comment, curatorName: withComment.curatorName, curatorIsOfficial: withComment.curatorIsOfficial, collectionTitle: withComment.collectionTitle }
        : null,
    });
  }

  return results.sort(
    (a, b) =>
      Number(b.allMatched) - Number(a.allMatched) ||
      b.matched.length - a.matched.length ||
      b.curators.length - a.curators.length ||
      a.space.name.localeCompare(b.space.name, "ko"),
  );
}

/** 마지막 글자에 받침이 있는지 — 조사(과/와, 이/가) 선택용. 한글이 아니면 받침 없음으로 본다. */
export function hasBatchim(word: string): boolean {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}

/** 표시 이름 — 사람 큐레이터는 "민지님", 공식 계정(공간큐브)은 이름 그대로. */
export function curatorDisplayName(c: { name: string; isOfficial?: boolean }): string {
  return c.isOfficial ? c.name : `${c.name}님`;
}

function curatorsSubject(curators: { name: string; isOfficial?: boolean }[]): string {
  const names = curators.map(curatorDisplayName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}${hasBatchim(names[0]) ? "과" : "와"} ${names[1]}`;
  return `${names[0]}, ${names[1]} 외 ${names.length - 2}명`;
}

/** "민지님과 공간큐브가 추천한 곳" / "현우님이 추천한 곳" / "민지님, 현우님 외 1명이 추천한 곳" */
export function curatorsLine(curators: { name: string; isOfficial?: boolean }[]): string {
  if (curators.length === 0) return "";
  const subject = curatorsSubject(curators);
  return `${subject}${hasBatchim(subject) ? "이" : "가"} 추천한 곳`;
}

/** 컬렉션 안에서 "다른 큐레이터도 고른 곳" — "공간큐브도 고른 곳" / "민지님과 공간큐브도 고른 곳" */
export function alsoPickedLine(curators: { name: string; isOfficial?: boolean }[]): string {
  return curators.length === 0 ? "" : `${curatorsSubject(curators)}도 고른 곳`;
}

/** 왜 이 결과에 나왔는지 — 실제로 맞은 조건으로만. */
export function finderReason(matched: MatchedCriterion[]): string | null {
  if (matched.length === 0) return null;
  const own = matched.filter((m) => m.via === "space").map((m) => m.label);
  const viaCol = matched.filter((m) => m.via === "collection");
  const parts: string[] = [];
  if (own.length) parts.push(`공간 특징이 '${own.join(" · ")}'에 맞아요`);
  for (const m of viaCol) parts.push(`'${m.collectionTitle}' 컬렉션에 담긴 곳이라 '${m.label}'에 맞아요`);
  return parts.join(" · ");
}
