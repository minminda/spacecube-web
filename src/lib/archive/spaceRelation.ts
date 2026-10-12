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

/* ── 다녀왔어요 / 또 갔어요 토글 ──────────────────────────────────────────
   공간 상세의 방문 버튼은 세 가지 상태: 방문 전(다녀왔어요) → 다녀온 곳(또 갔어요) → 이 화면에서 방금 재방문을 남김(또 갔어요 ✓).
   ✓ 상태에서 다시 누르면 방금 남긴 재방문 1건만 취소한다. 첫 방문 · 과거 방문 · Cube 방문은 상세에서 지우지 않는다. */

export type VisitAction = "first" | "revisit" | "undo";

/** revisitAdded = 이 화면에서 "또 갔어요"로 방문을 남겼고 아직 취소하지 않았는지 */
export function visitAction(visits: number, revisitAdded: boolean): VisitAction {
  if (revisitAdded) return "undo";
  return visits > 0 ? "revisit" : "first";
}

/** 취소는 "방금" 남긴 방문만 — 화면을 오래 열어 둔 경우까지 감안한 넉넉한 상한(그 뒤엔 내 기록에서) */
export const UNDO_REVISIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type UndoRevisitCheck = { ok: true } | { ok: false; status: 404 | 409; error: string };

/**
 * 또 갔어요 취소 판정(서버가 DB에서 읽은 값으로 호출). 지울 수 있는 방문은 다음을 모두 만족하는 ArchiveVisit 1건뿐이다.
 * ① 내 기록의 방문 ② 그 기록의 가장 최근 방문 ③ 날짜 · 메모 · 사진을 더하지 않은 빠른 방문(상세 버튼이 남기는 모양)
 * ④ 남긴 지 UNDO_REVISIT_WINDOW_MS 이내 ⑤ 지운 뒤에도 방문이 1회 이상 남음(내 기록 방문 + Cube 방문) — 첫 방문은 지우지 않는다.
 * Cube 방문(운영 Record)은 셀 때만 쓰고 지우는 대상이 아니다.
 */
export function checkUndoRevisit(x: {
  visit: { id: string; visitedOn: Date | null; memo: string | null; photos: number; createdAt: Date } | null;
  latestVisitId: string | null;
  /** 지우기 전 이 기록의 방문 수 */
  archiveVisits: number;
  cubeVisits: number;
  now: Date;
}): UndoRevisitCheck {
  const v = x.visit;
  if (!v) return { ok: false, status: 404, error: "방문을 찾을 수 없어요." };
  if (v.id !== x.latestVisitId) return { ok: false, status: 409, error: "가장 최근에 남긴 방문만 취소할 수 있어요." };
  if (v.visitedOn || v.memo || v.photos > 0) return { ok: false, status: 409, error: "날짜 · 메모 · 사진을 더한 방문은 내 기록에서 정리해주세요." };
  if (x.now.getTime() - v.createdAt.getTime() > UNDO_REVISIT_WINDOW_MS) return { ok: false, status: 409, error: "방금 남긴 방문만 취소할 수 있어요." };
  if (x.archiveVisits - 1 + x.cubeVisits < 1) return { ok: false, status: 409, error: "첫 방문은 취소할 수 없어요." };
  return { ok: true };
}
