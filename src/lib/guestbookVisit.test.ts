import { describe, it, expect } from "vitest";
import { resolveCurrentVisitRecordId } from "./guestbookVisit";

describe("resolveCurrentVisitRecordId", () => {
  it("요청한 recordId가 사용자·공간 소유 기록 목록에 있으면 그대로 사용한다", () => {
    const owned = [
      { id: "r1", visitedAt: new Date("2026-07-01") },
      { id: "r2", visitedAt: new Date("2026-07-10") },
    ];
    expect(resolveCurrentVisitRecordId("r1", owned)).toBe("r1");
  });

  it("요청한 recordId가 없으면(null) 가장 최근 기록으로 폴백한다", () => {
    const owned = [
      { id: "r1", visitedAt: new Date("2026-07-01") },
      { id: "r2", visitedAt: new Date("2026-07-10") },
    ];
    expect(resolveCurrentVisitRecordId(null, owned)).toBe("r2");
  });

  it("요청한 recordId가 소유 목록에 없으면(조작/타인 기록) 가장 최근 기록으로 폴백한다", () => {
    const owned = [
      { id: "r1", visitedAt: new Date("2026-07-01") },
      { id: "r2", visitedAt: new Date("2026-07-10") },
    ];
    expect(resolveCurrentVisitRecordId("someone-elses-record", owned)).toBe("r2");
  });

  it("소유 기록이 하나도 없으면 null을 반환한다", () => {
    expect(resolveCurrentVisitRecordId("r1", [])).toBeNull();
  });

  it("입력 순서와 무관하게 visitedAt이 가장 늦은 기록을 고른다", () => {
    const owned = [
      { id: "newest", visitedAt: new Date("2026-08-01") },
      { id: "oldest", visitedAt: new Date("2026-06-01") },
      { id: "middle", visitedAt: new Date("2026-07-01") },
    ];
    expect(resolveCurrentVisitRecordId(null, owned)).toBe("newest");
  });
});
