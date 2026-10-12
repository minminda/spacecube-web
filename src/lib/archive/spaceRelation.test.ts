import { describe, it, expect } from "vitest";
import { UNDO_REVISIT_WINDOW_MS, checkUndoRevisit, hasArchiveRecord, relationKind, relationText, visitAction } from "./spaceRelation";
import { parseCreateInput } from "./input";

describe("공간 상세 내 공간 — 또 간 곳 > 다녀온 곳 > 저장 > 없음", () => {
  it("기록 없음 → 문장 없음, 내 기록 링크 없음", () => {
    expect(relationKind(0, false)).toBe("none");
    expect(relationText(0, false)).toBeNull();
    expect(hasArchiveRecord(0, false)).toBe(false);
  });
  it("저장만", () => {
    expect(relationText(0, true)).toBe("내 공간에 저장한 곳이에요.");
    expect(hasArchiveRecord(0, true)).toBe(true);
  });
  it("방문 1회(저장 여부와 관계없이 방문이 우선)", () => {
    expect(relationText(1, true)).toBe("한 번 다녀온 곳이에요.");
    expect(relationText(1, false)).toBe("한 번 다녀온 곳이에요.");
    expect(hasArchiveRecord(1, false)).toBe(true);
  });
  it("방문 2회 이상", () => {
    expect(relationKind(3, true)).toBe("repeat");
    expect(relationText(3, true)).toBe("3번 다녀온 곳이에요.");
  });
});

describe("다녀왔어요 요청 본문 — 아카이브 공간 추가 API 재사용", () => {
  it("{ spaceId, status: VISITED } → 공간 이름으로 VISITED 기록 + 방문 1건(날짜 없음)", () => {
    const r = parseCreateInput({ spaceId: "ed1", status: "VISITED" }, { isAllowedPhoto: () => false, allowedTags: new Set(), spaceName: "북눅 연남" });
    expect(r).toMatchObject({ ok: true, data: { spaceId: "ed1", placeName: "북눅 연남", status: "VISITED", addVisit: true, visitedOn: null, photos: [], memo: null } });
  });
});

describe("또 갔어요 토글 — 버튼 상태", () => {
  it("방문 전 → 다녀왔어요, 다녀온 곳 → 또 갔어요, 이 화면에서 재방문을 남김 → ✓(다시 누르면 취소)", () => {
    expect(visitAction(0, false)).toBe("first");
    expect(visitAction(1, false)).toBe("revisit");
    expect(visitAction(4, false)).toBe("revisit");
    expect(visitAction(2, true)).toBe("undo");
  });
});

describe("또 갔어요 취소 판정 — 방금 남긴 재방문 1건만", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  const quick = { id: "v2", visitedOn: null, memo: null, photos: 0, createdAt: new Date("2026-10-12T09:59:00Z") };
  const base = { visit: quick, latestVisitId: "v2", archiveVisits: 2, cubeVisits: 0, now };

  it("첫 방문 + 방금 남긴 재방문 → 재방문 취소 가능", () => {
    expect(checkUndoRevisit(base)).toEqual({ ok: true });
  });
  it("내 기록 방문이 1건뿐이면(첫 방문) 취소 불가", () => {
    expect(checkUndoRevisit({ ...base, archiveVisits: 1 })).toMatchObject({ ok: false, status: 409 });
  });
  it("Cube 방문이 첫 방문이면 상세에서 남긴 유일한 방문도 취소 가능(Cube 방문은 남는다)", () => {
    expect(checkUndoRevisit({ ...base, archiveVisits: 1, cubeVisits: 1 })).toEqual({ ok: true });
  });
  it("가장 최근 방문이 아니면 불가 — 과거 방문을 상세에서 하나씩 지우지 않는다", () => {
    expect(checkUndoRevisit({ ...base, latestVisitId: "v3", archiveVisits: 4 })).toMatchObject({ ok: false, status: 409 });
  });
  it("날짜 · 메모 · 사진을 더한 방문은 불가(내 기록에서 정리)", () => {
    expect(checkUndoRevisit({ ...base, visit: { ...quick, memo: "좋았다" } })).toMatchObject({ ok: false });
    expect(checkUndoRevisit({ ...base, visit: { ...quick, visitedOn: new Date("2026-10-01") } })).toMatchObject({ ok: false });
    expect(checkUndoRevisit({ ...base, visit: { ...quick, photos: 1 } })).toMatchObject({ ok: false });
  });
  it("오래된 방문은 불가", () => {
    expect(checkUndoRevisit({ ...base, visit: { ...quick, createdAt: new Date(now.getTime() - UNDO_REVISIT_WINDOW_MS - 1) } })).toMatchObject({ ok: false, status: 409 });
  });
  it("없는 방문(다른 기록 · 다른 사용자) → 404", () => {
    expect(checkUndoRevisit({ ...base, visit: null })).toMatchObject({ ok: false, status: 404 });
  });
});
