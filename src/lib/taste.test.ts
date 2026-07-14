import { describe, it, expect } from "vitest";
import { getLatestRecordPerSpace, aggregateTags } from "./taste";

const SPACE_X = "space-x";
const SPACE_Y = "space-y";

describe("getLatestRecordPerSpace", () => {
  it("한 공간을 한 번 방문했으면 그 기록을 그대로 사용한다", () => {
    const records = [{ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") }];
    expect(getLatestRecordPerSpace(records)).toEqual(records);
  });

  it("같은 공간을 여러 번 방문했으면 visitedAt이 가장 최근인 기록만 남긴다", () => {
    const oldest = { id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") };
    const middle = { id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-07-20") };
    const newest = { id: "r3", spaceId: SPACE_X, visitedAt: new Date("2026-08-10") };
    const result = getLatestRecordPerSpace([oldest, middle, newest]);
    expect(result).toEqual([newest]);
  });

  it("여러 공간은 각각 최신 기록 1개씩 반환한다", () => {
    const xOld = { id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") };
    const xNew = { id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01") };
    const yOnly = { id: "r3", spaceId: SPACE_Y, visitedAt: new Date("2026-07-15") };
    const result = getLatestRecordPerSpace([xOld, xNew, yOnly]);
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([xNew, yOnly]));
  });

  it("visitedAt이 동일하면 id가 더 큰(사전순 뒤) 쪽을 결정적으로 선택한다", () => {
    const a = { id: "r-a", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") };
    const b = { id: "r-b", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") };
    expect(getLatestRecordPerSpace([a, b])).toEqual([b]);
    // 입력 순서를 바꿔도 항상 같은 결과(결정적)
    expect(getLatestRecordPerSpace([b, a])).toEqual([b]);
  });

  it("과거 기록 자체는 지우지 않는다 — 원본 배열은 그대로 유지된다", () => {
    const original = [
      { id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01") },
      { id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01") },
    ];
    const originalLength = original.length;
    getLatestRecordPerSpace(original);
    expect(original).toHaveLength(originalLength); // 함수가 원본을 변형하지 않음
  });
});

describe("aggregateTags (최신 방문 기준 집계)", () => {
  it("같은 공간을 여러 번 방문해도 가장 최근 방문의 태그만 반영한다", () => {
    const records = [
      { id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tags: [{ tag: "QUIET" as const }] },
      { id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01"), tags: [{ tag: "WARM" as const }] },
    ];
    const result = aggregateTags(records);
    expect(result).toEqual([["WARM", 1]]);
    expect(result.find(([tag]) => tag === "QUIET")).toBeUndefined();
  });

  it("여러 공간은 각각 최신 방문의 태그를 합산한다", () => {
    const records = [
      { id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tags: [{ tag: "QUIET" as const }] },
      { id: "r2", spaceId: SPACE_Y, visitedAt: new Date("2026-07-05"), tags: [{ tag: "QUIET" as const }] },
    ];
    const result = aggregateTags(records);
    expect(result).toEqual([["QUIET", 2]]);
  });
});
