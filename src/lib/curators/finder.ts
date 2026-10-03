/* ── 큐레이터 공용 타입 · 한국어 표기 도우미(순수 함수) ─────────────────────────────
   공간 찾기는 src/lib/finder/spaceFinder.ts가 맡는다(찾기 자체가 개인화 정렬). 이 모듈은 큐레이터 관계
   데이터의 형태와 "민지님과 공간큐브가 추천한 곳" 같은 문장을 받침에 맞게 만드는 도우미만 둔다. ── */

export interface FinderSpace {
  id: string;
  name: string;
  area: string;
  category: string;
  tags?: string[];
}

/** 큐레이터 컬렉션에 담긴 공간 한 건(공간 × 컬렉션). */
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
