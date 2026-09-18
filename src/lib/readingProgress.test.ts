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

  describe("isAtPageBottom — 마지막 Scene 아래 여백이 짧아 readLine이 도달 못 하는 구조적 한계 보정", () => {
    it("페이지 끝에 도달하면 readLine이 마지막 Scene bottom에 못 미쳐도 마지막만 100%", () => {
      // readLine=550이 마지막 Scene(500~700)의 중간(25%)에 불과해도 페이지 끝이면 100%.
      const result = computeSceneProgress(550, scenes([100, 300], [300, 500], [500, 700]), { isAtPageBottom: true });
      expect(result[2]).toBe(1);
    });

    it("페이지 끝이 아니면 마지막 Scene도 평소대로 부분 진행만 반영한다", () => {
      const result = computeSceneProgress(550, scenes([100, 300], [300, 500], [500, 700]), { isAtPageBottom: false });
      expect(result[2]).toBeCloseTo(0.25, 5);
    });

    it("옵션을 생략하면 기존과 동일하게 동작한다(하위 호환)", () => {
      const withOption = computeSceneProgress(550, scenes([100, 300], [300, 500], [500, 700]));
      expect(withOption[2]).toBeCloseTo(0.25, 5);
    });

    it("마지막 Scene 이전 Scene들의 값은 isAtPageBottom과 무관하게 그대로다", () => {
      const result = computeSceneProgress(650, scenes([100, 300], [300, 500], [500, 700]), { isAtPageBottom: true });
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(1);
    });

    it("Scene이 없으면 isAtPageBottom이어도 빈 배열 그대로", () => {
      expect(computeSceneProgress(100, [], { isAtPageBottom: true })).toEqual([]);
    });

    it("페이지 끝에서 다시 위로 스크롤하면(isAtPageBottom=false로 전환) 마지막 Scene 진행도도 감소한다", () => {
      const bounds = scenes([100, 300], [300, 500], [500, 700]);
      const atBottom = computeSceneProgress(560, bounds, { isAtPageBottom: true });
      const scrolledUp = computeSceneProgress(560, bounds, { isAtPageBottom: false });
      expect(atBottom[2]).toBe(1);
      expect(scrolledUp[2]).toBeLessThan(1);
      expect(scrolledUp[2]).toBeCloseTo(0.3, 5);
    });
  });
});
