import { describe, it, expect } from "vitest";
import { buildTasteVector, buildWeightedTasteVector, type VectorRecord, type WeightedVectorRecord } from "./recommend";

const SPACE_X = "space-x";
const SPACE_Y = "space-y";

function vecRecord(overrides: Partial<VectorRecord> & { id: string; spaceId: string; visitedAt: Date }): VectorRecord {
  return {
    tasteScore: null,
    tags: [],
    space: { spaceTags: [] },
    ...overrides,
  };
}

function weightedRecord(
  overrides: Partial<WeightedVectorRecord> & { id: string; spaceId: string; visitedAt: Date },
): WeightedVectorRecord {
  return {
    tasteScore: null,
    space: { spaceTags: [] },
    ...overrides,
  };
}

describe("buildTasteVector — 같은 공간은 최신 방문 1개만 반영", () => {
  it("한 공간을 한 번 방문했으면 그 점수를 그대로 사용한다", () => {
    const vector = buildTasteVector([
      vecRecord({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5, space: { spaceTags: ["QUIET"] } }),
    ]);
    expect(vector.QUIET).toBe(5);
  });

  it("같은 공간을 여러 번 방문하면 최신 점수만 사용하고 과거 점수를 누적하지 않는다", () => {
    const vector = buildTasteVector([
      vecRecord({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5, space: { spaceTags: ["QUIET"] } }),
      vecRecord({ id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-07-20"), tasteScore: 3, space: { spaceTags: ["QUIET"] } }),
      vecRecord({ id: "r3", spaceId: SPACE_X, visitedAt: new Date("2026-08-10"), tasteScore: 4, space: { spaceTags: ["QUIET"] } }),
    ]);
    // 5+3+4=12가 아니라 최신 방문(2026-08-10)의 4점만 반영되어야 한다
    expect(vector.QUIET).toBe(4);
  });

  it("최신 점수가 낮아지면(재방문에서 낮은 점수) 벡터 기여도도 낮아진다", () => {
    const vector = buildTasteVector([
      vecRecord({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5, space: { spaceTags: ["WARM"] } }),
      vecRecord({ id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01"), tasteScore: 2, space: { spaceTags: ["WARM"] } }),
    ]);
    expect(vector.WARM).toBe(2);
  });

  it("최신 점수가 높아지면(재방문에서 높은 점수) 벡터 기여도도 높아진다", () => {
    const vector = buildTasteVector([
      vecRecord({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 2, space: { spaceTags: ["WARM"] } }),
      vecRecord({ id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01"), tasteScore: 5, space: { spaceTags: ["WARM"] } }),
    ]);
    expect(vector.WARM).toBe(5);
  });

  it("동일 날짜라면 id 기준으로 일관되게 최신 기록을 선택한다", () => {
    const a = vecRecord({ id: "r-a", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 2, space: { spaceTags: ["WARM"] } });
    const b = vecRecord({ id: "r-b", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5, space: { spaceTags: ["WARM"] } });
    expect(buildTasteVector([a, b]).WARM).toBe(5);
    expect(buildTasteVector([b, a]).WARM).toBe(5); // 입력 순서를 바꿔도 결과가 같아야 함(결정적)
  });

  it("여러 공간은 각각 최신 기록 1개씩만 합산한다", () => {
    const vector = buildTasteVector([
      vecRecord({ id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5, space: { spaceTags: ["QUIET"] } }),
      vecRecord({ id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-07-20"), tasteScore: 1, space: { spaceTags: ["QUIET"] } }), // 무시돼야 함
      vecRecord({ id: "r3", spaceId: SPACE_Y, visitedAt: new Date("2026-07-05"), tasteScore: 3, space: { spaceTags: ["UNIQUE"] } }),
    ]);
    expect(vector.QUIET).toBe(1); // space-x의 최신 방문(07-20) 점수만
    expect(vector.UNIQUE).toBe(3);
  });
});

describe("buildWeightedTasteVector — 같은 공간은 최신 방문 1개만 반영", () => {
  it("같은 공간을 여러 번 방문해도 최신 점수만 SpaceTag.weight와 곱해진다", () => {
    const vector = buildWeightedTasteVector([
      weightedRecord({
        id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5,
        space: { spaceTags: [], spaceTagLinks: [{ weight: 2, tag: { legacyKey: "QUIET", isActive: true, useForRecommendation: true } }] },
      }),
      weightedRecord({
        id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01"), tasteScore: 3,
        space: { spaceTags: [], spaceTagLinks: [{ weight: 2, tag: { legacyKey: "QUIET", isActive: true, useForRecommendation: true } }] },
      }),
    ]);
    // 5*2 + 3*2(누적)이 아니라 최신 방문의 3*2=6만 반영
    expect(vector.QUIET).toBe(6);
  });
});
