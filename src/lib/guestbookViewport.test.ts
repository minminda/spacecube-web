import { describe, it, expect } from "vitest";
import { computeInitialViewport } from "./guestbookViewport";

const FALLBACK = { x: 2500, y: 2500 };

describe("computeInitialViewport — 방명록 초기 진입 viewport", () => {
  it("질문·포스트잇이 모두 없으면 fallback 좌표를 그대로 쓴다", () => {
    const result = computeInitialViewport([], FALLBACK);
    expect(result.cx).toBe(FALLBACK.x);
    expect(result.cy).toBe(FALLBACK.y);
    expect(result.span).toBeGreaterThan(0);
  });

  it("점이 하나뿐이면 그 점을 중심으로 잡는다", () => {
    const result = computeInitialViewport([{ x: 1000, y: 1500 }], FALLBACK);
    expect(result.cx).toBe(1000);
    expect(result.cy).toBe(1500);
  });

  it("질문 군집만 있을 때 군집들의 중심을 기준으로 잡는다", () => {
    const clusters = [
      { x: 2400, y: 2500 },
      { x: 2600, y: 2500 },
    ];
    const result = computeInitialViewport(clusters, FALLBACK);
    expect(result.cx).toBeCloseTo(2500, 0);
    expect(result.cy).toBeCloseTo(2500, 0);
  });

  it("한 군데 몰려 있는 포스트잇 무리를 대표 영역으로 잡는다", () => {
    const denseCluster = [
      { x: 1000, y: 1000 },
      { x: 1050, y: 1020 },
      { x: 980, y: 1040 },
      { x: 1020, y: 980 },
    ];
    const result = computeInitialViewport(denseCluster, FALLBACK);
    expect(result.cx).toBeGreaterThan(900);
    expect(result.cx).toBeLessThan(1150);
    expect(result.cy).toBeGreaterThan(900);
    expect(result.cy).toBeLessThan(1150);
  });

  it("콘텐츠가 두 곳에 멀리 떨어져 있으면 전체를 욱여넣지 않고 더 밀집한 한쪽만 대표 영역으로 삼는다", () => {
    const farApart = [
      // 밀집된 무리 (4개, 좁은 영역)
      { x: 500, y: 500 },
      { x: 520, y: 500 },
      { x: 500, y: 520 },
      { x: 520, y: 520 },
      // 멀리 떨어진 점 하나
      { x: 4500, y: 4500 },
    ];
    const result = computeInitialViewport(farApart, FALLBACK);
    // 대표 영역은 밀집된 무리 쪽이어야 하고, span은 전체 거리(약 4000)보다 훨씬 작아야 한다
    expect(result.cx).toBeLessThan(1000);
    expect(result.cy).toBeLessThan(1000);
    expect(result.span).toBeLessThan(2000);
  });

  it("span은 콘텐츠가 아무리 좁아도 최소값 이상을 유지한다(과도한 확대 방지)", () => {
    const tightCluster = [
      { x: 1000, y: 1000 },
      { x: 1001, y: 1000 },
    ];
    const result = computeInitialViewport(tightCluster, FALLBACK);
    expect(result.span).toBeGreaterThanOrEqual(900);
  });
});
