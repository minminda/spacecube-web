import { describe, it, expect } from "vitest";
import { computeFitToContentViewport, pickHeroPoint } from "./guestbookViewport";

const FALLBACK = { x: 2500, y: 2500 };

describe("computeFitToContentViewport — 방명록 fit-to-content viewport", () => {
  it("질문·포스트잇이 모두 없으면 fallback 좌표를 그대로 쓴다", () => {
    const result = computeFitToContentViewport([], FALLBACK);
    expect(result.cx).toBe(FALLBACK.x);
    expect(result.cy).toBe(FALLBACK.y);
    expect(result.span).toBeGreaterThan(0);
  });

  it("점이 하나뿐이면 그 점을 중심으로 잡는다", () => {
    const result = computeFitToContentViewport([{ x: 1000, y: 1500 }], FALLBACK);
    expect(result.cx).toBe(1000);
    expect(result.cy).toBe(1500);
  });

  it("질문 군집만 있을 때 군집들의 중심을 기준으로 잡는다", () => {
    const clusters = [
      { x: 2400, y: 2500 },
      { x: 2600, y: 2500 },
    ];
    const result = computeFitToContentViewport(clusters, FALLBACK);
    expect(result.cx).toBeCloseTo(2500, 0);
    expect(result.cy).toBeCloseTo(2500, 0);
  });

  it("한 군데 몰려 있는 포스트잇 무리는 그 중심과 좁은 span을 반환한다", () => {
    const denseCluster = [
      { x: 1000, y: 1000 },
      { x: 1050, y: 1020 },
      { x: 980, y: 1040 },
      { x: 1020, y: 980 },
    ];
    const result = computeFitToContentViewport(denseCluster, FALLBACK);
    expect(result.cx).toBeGreaterThan(900);
    expect(result.cx).toBeLessThan(1150);
    expect(result.cy).toBeGreaterThan(900);
    expect(result.cy).toBeLessThan(1150);
    expect(result.span).toBe(900 + 700); // 무리 자체(70px 남짓)는 MIN_SPAN(900) 바닥에 걸림 + 여백(700)
  });

  it("콘텐츠가 두 곳에 멀리 떨어져 있어도 하나도 빠뜨리지 않고 전체를 아우른다(=fit-to-content)", () => {
    const farApart = [
      { x: 500, y: 500 },
      { x: 520, y: 500 },
      { x: 500, y: 520 },
      { x: 520, y: 520 },
      { x: 4500, y: 4500 },
    ];
    const result = computeFitToContentViewport(farApart, FALLBACK);
    // bounding box 중심(min/max의 정중앙, 500~4500 → 2500)과, 전체를 담기에 충분한 span(약 4000+여백)을 반환해야 한다
    expect(result.cx).toBe(2500);
    expect(result.cy).toBe(2500);
    expect(result.span).toBeGreaterThan(4000);
  });

  it("span은 콘텐츠가 아무리 좁아도 최소값 이상을 유지한다(과도한 확대 방지)", () => {
    const tightCluster = [
      { x: 1000, y: 1000 },
      { x: 1001, y: 1000 },
    ];
    const result = computeFitToContentViewport(tightCluster, FALLBACK);
    expect(result.span).toBeGreaterThanOrEqual(900);
  });
});

describe("pickHeroPoint — 진입 연출의 대표(히어로) 포스트잇 선택", () => {
  it("점이 없으면 null", () => {
    expect(pickHeroPoint([])).toBeNull();
  });

  it("점이 하나면 그 점을 그대로 반환한다", () => {
    const only = { x: 10, y: 20 };
    expect(pickHeroPoint([only])).toBe(only);
  });

  it("무게중심에 가장 가까운 점을 고른다", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 10 }, // centroid(50, 3.33)에 가장 가까움
    ];
    const hero = pickHeroPoint(points);
    expect(hero).toEqual({ x: 50, y: 10 });
  });

  it("멀리 떨어진 이상치가 하나 있어도 중심 무리 쪽에서 고른다", () => {
    const points = [
      { x: 1000, y: 1000 },
      { x: 1010, y: 1000 },
      { x: 1000, y: 1010 },
      { x: 5000, y: 5000 }, // 이상치
    ];
    const hero = pickHeroPoint(points);
    expect(hero!.x).toBeLessThan(1100);
    expect(hero!.y).toBeLessThan(1100);
  });
});
