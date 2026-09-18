import { describe, it, expect } from "vitest";
import { findLargestDropOff, type DropOffStage } from "./storyDepth";

function stage(key: string, value: number): DropOffStage {
  return { key, value };
}

describe("findLargestDropOff", () => {
  it("단계가 없거나 하나뿐이면 null", () => {
    expect(findLargestDropOff([])).toBeNull();
    expect(findLargestDropOff([stage("view", 100)])).toBeNull();
  });

  it("가장 크게 줄어든 구간을 찾는다", () => {
    const stages = [stage("view", 100), stage("scene2", 91), stage("scene3", 88), stage("scene4", 51), stage("scene5", 47)];
    const result = findLargestDropOff(stages);
    expect(result).toEqual({ fromKey: "scene3", toKey: "scene4", dropCount: 37, dropRate: 37 / 88 });
  });

  it("값이 늘어나는 구간(여러 진입 경로)은 이탈로 잡지 않는다", () => {
    const stages = [stage("view", 50), stage("scene2", 80), stage("scene3", 40)];
    const result = findLargestDropOff(stages);
    expect(result).toEqual({ fromKey: "scene2", toKey: "scene3", dropCount: 40, dropRate: 0.5 });
  });

  it("전부 동일하거나 증가만 하면 null(이탈 구간 없음)", () => {
    expect(findLargestDropOff([stage("a", 10), stage("b", 10), stage("c", 20)])).toBeNull();
  });

  it("분모(직전 단계)가 0이면 dropRate는 null이지만 dropCount는 계산되지 않는다(0에서는 줄어들 수 없음)", () => {
    // prev=0이면 dropCount = 0 - curr <= 0 이므로 애초에 후보가 되지 않는다 — 0으로 나누는 상황 자체가 발생하지 않는다.
    expect(findLargestDropOff([stage("a", 0), stage("b", 5)])).toBeNull();
  });

  it("동률이면 먼저 나온 구간을 우선한다", () => {
    const stages = [stage("a", 100), stage("b", 80), stage("c", 60)];
    const result = findLargestDropOff(stages);
    expect(result?.fromKey).toBe("a");
    expect(result?.toKey).toBe("b");
  });

  it("Story View가 0명이어도 에러 없이 null(모두 0이라 이탈 계산 불가)", () => {
    expect(findLargestDropOff([stage("view", 0), stage("scene2", 0), stage("complete", 0)])).toBeNull();
  });
});
