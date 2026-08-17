import { describe, it, expect } from "vitest";
import { computeCropRect } from "./imageCrop";

describe("computeCropRect — 원본 이미지 픽셀 좌표계에서의 crop 영역 계산", () => {
  it("zoom=1, 중앙 위치면 원본 안에 들어가는 가장 큰 aspectRatio 영역을 반환한다(가로가 더 넓은 원본)", () => {
    // 원본 2000x1000(가로가 더 넓음), 목표 비율 3:2(1.5) — 높이(1000) 기준으로 폭을 잘라야 함
    const rect = computeCropRect(2000, 1000, 3 / 2, 0.5, 0.5, 1);
    expect(rect.height).toBe(1000);
    expect(rect.width).toBeCloseTo(1500, 0);
    expect(rect.x).toBeCloseTo((2000 - 1500) / 2, 0);
    expect(rect.y).toBe(0);
  });

  it("zoom=1, 중앙 위치면 원본 안에 들어가는 가장 큰 aspectRatio 영역을 반환한다(세로가 더 긴 원본)", () => {
    // 원본 1000x2000(세로가 더 긺), 목표 비율 3:2 — 폭(1000) 기준으로 높이를 잘라야 함
    const rect = computeCropRect(1000, 2000, 3 / 2, 0.5, 0.5, 1);
    expect(rect.width).toBe(1000);
    expect(rect.height).toBeCloseTo(1000 / 1.5, 0);
  });

  it("zoom이 커지면 잘라내는 영역이 좁아진다(더 확대해서 보는 것과 같다)", () => {
    const zoom1 = computeCropRect(2000, 1000, 3 / 2, 0.5, 0.5, 1);
    const zoom2 = computeCropRect(2000, 1000, 3 / 2, 0.5, 0.5, 2);
    expect(zoom2.width).toBeCloseTo(zoom1.width / 2, 0);
    expect(zoom2.height).toBeCloseTo(zoom1.height / 2, 0);
  });

  it("positionX/Y로 중심을 옮길 수 있다", () => {
    const centered = computeCropRect(2000, 1000, 3 / 2, 0.5, 0.5, 2);
    const shifted = computeCropRect(2000, 1000, 3 / 2, 0.25, 0.5, 2);
    expect(shifted.x).toBeLessThan(centered.x);
  });

  it("원본 경계를 벗어나지 않도록 clamp한다(가장자리로 밀어도 잘라내는 영역이 원본을 넘지 않음)", () => {
    const rect = computeCropRect(2000, 1000, 3 / 2, 0, 0, 1);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(2000 + 0.001);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1000 + 0.001);

    const rectMax = computeCropRect(2000, 1000, 3 / 2, 1, 1, 1);
    expect(rectMax.x + rectMax.width).toBeLessThanOrEqual(2000 + 0.001);
    expect(rectMax.y + rectMax.height).toBeLessThanOrEqual(1000 + 0.001);
  });

  it("정사각형 원본을 3:2(가로가 더 넓은 비율)로 자르면 폭은 그대로 두고 위아래를 잘라낸다", () => {
    // object-fit:cover와 동일한 방향: 정사각형은 목표보다 "덜 가로로 넓으므로" 폭을 꽉 채우고
    // 높이 쪽을 크롭한다(3:2에서 1000x1000 → 1000x666.67).
    const rect = computeCropRect(1000, 1000, 3 / 2, 0.5, 0.5, 1);
    expect(rect.width).toBe(1000);
    expect(rect.height).toBeCloseTo(1000 / 1.5, 0);
  });
});
