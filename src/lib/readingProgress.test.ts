import { describe, it, expect } from "vitest";
import { computeSceneProgress, type SceneBounds } from "./readingProgress";

function scenes(...bounds: Array<[number, number]>): SceneBounds[] {
  return bounds.map(([top, bottom]) => ({ top, bottom }));
}

describe("computeSceneProgress", () => {
  it("Scene 목록이 비어있으면 빈 배열", () => {
    expect(computeSceneProgress(0, [])).toEqual([]);
  });

  it("readLine이 첫 Scene 시작 이전이면 전부 0", () => {
    const result = computeSceneProgress(50, scenes([100, 300], [300, 500]));
    expect(result).toEqual([0, 0]);
  });

  it("readLine이 Scene 내부 중간이면 비례해서 채워진다", () => {
    // scene1: 100~300 (길이 200), readLine=200 → 절반
    const result = computeSceneProgress(200, scenes([100, 300], [300, 500]));
    expect(result[0]).toBeCloseTo(0.5, 5);
    expect(result[1]).toBe(0);
  });

  it("지나온 Scene은 100%, 현재 Scene만 부분 진행", () => {
    // scene1 완전히 지남, scene2(300~500) 40% 지점(readLine=380)
    const result = computeSceneProgress(380, scenes([100, 300], [300, 500], [500, 700]));
    expect(result[0]).toBe(1);
    expect(result[1]).toBeCloseTo(0.4, 5);
    expect(result[2]).toBe(0);
  });

  it("readLine이 마지막 Scene 끝을 넘으면 전부 100%", () => {
    const result = computeSceneProgress(10000, scenes([100, 300], [300, 500], [500, 700]));
    expect(result).toEqual([1, 1, 1]);
  });

  it("위로 다시 스크롤하면(readLine 감소) 진행도도 다시 줄어든다", () => {
    const bounds = scenes([100, 300], [300, 500], [500, 700]);
    const down = computeSceneProgress(650, bounds); // scene3 중간까지
    const backUp = computeSceneProgress(200, bounds); // scene1 중간으로 복귀
    expect(down[2]).toBeGreaterThan(0);
    expect(backUp[1]).toBe(0);
    expect(backUp[2]).toBe(0);
    expect(backUp[0]).toBeCloseTo(0.5, 5);
  });

  it("높이가 0인 Scene은 readLine 도달 여부로만 판단(0으로 나누지 않음)", () => {
    const result = computeSceneProgress(150, scenes([100, 100], [200, 300]));
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(0);
  });

  it("음수/경계값도 0~1 범위로 clamp된다", () => {
    const result = computeSceneProgress(-100, scenes([100, 300]));
    expect(result[0]).toBe(0);
  });
});
