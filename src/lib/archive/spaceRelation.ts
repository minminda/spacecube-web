/* ── 공간 상세의 "내 공간" 한 줄(순수 함수, 클라이언트·테스트 공용) ─────────────
   상태 판정은 공간 추가 검색과 같은 myStateOf(내 기록 방문 + Cube 방문)를 서버에서 계산해 visits로 넘긴다.
   표시 우선순위: 또 간 곳(2회+) > 다녀온 곳 > 저장 > 아무 기록 없음. 저장은 방문이 있으면 보조 상태(버튼 표시만). ── */

export type RelationKind = "repeat" | "visited" | "saved" | "none";

export function relationKind(visits: number, saved: boolean): RelationKind {
  if (visits >= 2) return "repeat";
  if (visits === 1) return "visited";
  return saved ? "saved" : "none";
}

/** 상태 문장 — 기록이 없으면 문장 없이 버튼만 보여 준다. */
export function relationText(visits: number, saved: boolean): string | null {
  switch (relationKind(visits, saved)) {
    case "repeat": return `${visits}번 다녀온 곳이에요.`;
    case "visited": return "한 번 다녀온 곳이에요.";
    case "saved": return "내 공간에 저장한 곳이에요.";
    default: return null;
  }
}

/** 아카이브 상세(/archive/p/s-<slug>)가 열리는 상태인지 — 저장 또는 방문(내 기록 · Cube)이 하나라도 있으면. */
export function hasArchiveRecord(visits: number, saved: boolean): boolean {
  return visits > 0 || saved;
}
