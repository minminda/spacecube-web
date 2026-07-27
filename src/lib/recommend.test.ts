import { describe, it, expect } from "vitest";
import { buildWeightedTasteVector, type WeightedVectorRecord, type SpaceTagLinkLike } from "./recommend";

const SPACE_X = "space-x";
const SPACE_Y = "space-y";

const QUIET_TAG = { id: "tag-quiet", name: "조용한", isActive: true, useForRecommendation: true };
const UNIQUE_TAG = { id: "tag-unique", name: "독특한", isActive: true, useForRecommendation: true };
const WARM_TAG = { id: "tag-warm", name: "따뜻한", isActive: true, useForRecommendation: true };

function link(weight: number, tag: typeof QUIET_TAG): SpaceTagLinkLike & { weight: number } {
  return { weight, visibleToUsers: true, tag };
}

function weightedRecord(
  overrides: Partial<WeightedVectorRecord> & { id: string; spaceId: string; visitedAt: Date },
): WeightedVectorRecord {
  return {
    tasteScore: null,
    space: { spaceTagLinks: [] },
    ...overrides,
  };
}

describe("buildWeightedTasteVector — 같은 공간은 최신 방문 1개만 반영", () => {
  it("한 공간을 한 번 방문했으면 tasteScore × weight를 그대로 사용한다", () => {
    const vector = buildWeightedTasteVector([
      weightedRecord({
        id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5,
        space: { spaceTagLinks: [link(1, QUIET_TAG)] },
      }),
    ]);
    expect(vector[QUIET_TAG.id]).toBe(5);
  });

  it("같은 공간을 여러 번 방문해도 최신 점수만 SpaceTag.weight와 곱해진다", () => {
    const vector = buildWeightedTasteVector([
      weightedRecord({
        id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5,
        space: { spaceTagLinks: [link(2, QUIET_TAG)] },
      }),
      weightedRecord({
        id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01"), tasteScore: 3,
        space: { spaceTagLinks: [link(2, QUIET_TAG)] },
      }),
    ]);
    // 5*2 + 3*2(누적)이 아니라 최신 방문의 3*2=6만 반영
    expect(vector[QUIET_TAG.id]).toBe(6);
  });

  it("최신 점수가 낮아지면(재방문에서 낮은 점수) 벡터 기여도도 낮아진다", () => {
    const vector = buildWeightedTasteVector([
      weightedRecord({
        id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5,
        space: { spaceTagLinks: [link(1, WARM_TAG)] },
      }),
      weightedRecord({
        id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01"), tasteScore: 2,
        space: { spaceTagLinks: [link(1, WARM_TAG)] },
      }),
    ]);
    expect(vector[WARM_TAG.id]).toBe(2);
  });

  it("최신 점수가 높아지면(재방문에서 높은 점수) 벡터 기여도도 높아진다", () => {
    const vector = buildWeightedTasteVector([
      weightedRecord({
        id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 2,
        space: { spaceTagLinks: [link(1, WARM_TAG)] },
      }),
      weightedRecord({
        id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-08-01"), tasteScore: 5,
        space: { spaceTagLinks: [link(1, WARM_TAG)] },
      }),
    ]);
    expect(vector[WARM_TAG.id]).toBe(5);
  });

  it("동일 날짜라면 id 기준으로 일관되게 최신 기록을 선택한다", () => {
    const a = weightedRecord({
      id: "r-a", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 2,
      space: { spaceTagLinks: [link(1, WARM_TAG)] },
    });
    const b = weightedRecord({
      id: "r-b", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5,
      space: { spaceTagLinks: [link(1, WARM_TAG)] },
    });
    expect(buildWeightedTasteVector([a, b])[WARM_TAG.id]).toBe(5);
    expect(buildWeightedTasteVector([b, a])[WARM_TAG.id]).toBe(5); // 입력 순서를 바꿔도 결과가 같아야 함(결정적)
  });

  it("여러 공간은 각각 최신 기록 1개씩만 합산한다", () => {
    const vector = buildWeightedTasteVector([
      weightedRecord({
        id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5,
        space: { spaceTagLinks: [link(1, QUIET_TAG)] },
      }),
      weightedRecord({
        id: "r2", spaceId: SPACE_X, visitedAt: new Date("2026-07-20"), tasteScore: 1,
        space: { spaceTagLinks: [link(1, QUIET_TAG)] },
      }), // 무시돼야 함
      weightedRecord({
        id: "r3", spaceId: SPACE_Y, visitedAt: new Date("2026-07-05"), tasteScore: 3,
        space: { spaceTagLinks: [link(1, UNIQUE_TAG)] },
      }),
    ]);
    expect(vector[QUIET_TAG.id]).toBe(1); // space-x의 최신 방문(07-20) 점수만
    expect(vector[UNIQUE_TAG.id]).toBe(3);
  });

  it("비활성/추천제외 태그는 벡터에 반영하지 않는다", () => {
    const vector = buildWeightedTasteVector([
      weightedRecord({
        id: "r1", spaceId: SPACE_X, visitedAt: new Date("2026-07-01"), tasteScore: 5,
        space: {
          spaceTagLinks: [
            link(1, { ...QUIET_TAG, isActive: false }),
            link(1, { ...WARM_TAG, useForRecommendation: false }),
          ],
        },
      }),
    ]);
    expect(vector[QUIET_TAG.id]).toBeUndefined();
    expect(vector[WARM_TAG.id]).toBeUndefined();
  });
});
