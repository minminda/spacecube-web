import { describe, it, expect } from "vitest";
import { hasArchiveRecord, relationKind, relationText } from "./spaceRelation";
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
