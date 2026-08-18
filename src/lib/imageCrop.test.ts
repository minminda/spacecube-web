import { describe, it, expect } from "vitest";
import { clampRect, moveRect, resizeRectFromCorner, centeredRect, scaleRectToNatural } from "./imageCrop";

describe("clampRect", () => {
  it("경계 안에 있으면 그대로 둔다", () => {
    const rect = clampRect({ x: 10, y: 10, width: 100, height: 80 }, 400, 300);
    expect(rect).toEqual({ x: 10, y: 10, width: 100, height: 80 });
  });

  it("경계를 벗어나면 안으로 밀어넣는다", () => {
    const rect = clampRect({ x: 380, y: 280, width: 100, height: 80 }, 400, 300);
    expect(rect.x + rect.width).toBeLessThanOrEqual(400);
    expect(rect.y + rect.height).toBeLessThanOrEqual(300);
  });

  it("크기가 경계보다 크면 경계 크기로 줄인다", () => {
    const rect = clampRect({ x: 0, y: 0, width: 500, height: 500 }, 400, 300);
    expect(rect.width).toBe(400);
    expect(rect.height).toBe(300);
  });

  it("최소 크기 미만이면 최소 크기로 키운다", () => {
    const rect = clampRect({ x: 0, y: 0, width: 5, height: 5 }, 400, 300, 20);
    expect(rect.width).toBe(20);
    expect(rect.height).toBe(20);
  });
});

describe("moveRect", () => {
  it("delta만큼 이동한다", () => {
    const rect = moveRect({ x: 50, y: 50, width: 100, height: 100 }, 20, -10, 400, 300);
    expect(rect.x).toBe(70);
    expect(rect.y).toBe(40);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(100);
  });

  it("경계 밖으로 이동하려 하면 경계 안에 붙는다(크기는 유지)", () => {
    const rect = moveRect({ x: 350, y: 250, width: 100, height: 100 }, 100, 100, 400, 300);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(100);
    expect(rect.x).toBe(300);
    expect(rect.y).toBe(200);
  });
});

describe("resizeRectFromCorner — 자유(aspect=null)", () => {
  const base = { x: 100, y: 100, width: 200, height: 150 };

  it("se(오른쪽 아래) 모서리를 바깥으로 끌면 폭/높이가 늘어나고 반대쪽(왼쪽 위)은 고정된다", () => {
    const rect = resizeRectFromCorner(base, "se", 50, 30, null, 1000, 1000);
    expect(rect.x).toBe(100);
    expect(rect.y).toBe(100);
    expect(rect.width).toBeCloseTo(250, 0);
    expect(rect.height).toBeCloseTo(180, 0);
  });

  it("nw(왼쪽 위) 모서리를 안쪽으로 끌면 오른쪽 아래(반대 모서리)는 고정된다", () => {
    const rect = resizeRectFromCorner(base, "nw", 30, 20, null, 1000, 1000);
    expect(rect.x + rect.width).toBeCloseTo(base.x + base.width, 0);
    expect(rect.y + rect.height).toBeCloseTo(base.y + base.height, 0);
  });

  it("최소 크기보다 작아지도록 끌어도 최소 크기 이하로 줄지 않는다", () => {
    const rect = resizeRectFromCorner(base, "se", -1000, -1000, null, 1000, 1000, 40);
    expect(rect.width).toBeGreaterThanOrEqual(40);
    expect(rect.height).toBeGreaterThanOrEqual(40);
  });

  it("경계 밖으로 나가지 않는다", () => {
    const rect = resizeRectFromCorner({ x: 950, y: 950, width: 40, height: 40 }, "se", 200, 200, null, 1000, 1000);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1000);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1000);
  });
});

describe("resizeRectFromCorner — 비율 고정(3:2)", () => {
  it("고정 비율일 때 결과의 width/height 비율이 유지된다", () => {
    const base = { x: 100, y: 100, width: 300, height: 200 }; // 3:2
    const rect = resizeRectFromCorner(base, "se", 60, 10 /* dy는 aspect가 있으면 무시되고 width 기준으로 재계산 */, 3 / 2, 1000, 1000);
    expect(rect.width / rect.height).toBeCloseTo(3 / 2, 1);
  });

  it("16:9 비율 고정도 유지된다", () => {
    const base = { x: 0, y: 0, width: 320, height: 180 }; // 16:9
    const rect = resizeRectFromCorner(base, "nw", -40, -5, 16 / 9, 1000, 1000);
    expect(rect.width / rect.height).toBeCloseTo(16 / 9, 1);
  });

  it("경계에 닿을 정도로 크게 늘려도 비율이 깨지지 않는다(독립적으로 clamp되면 비율이 틀어짐)", () => {
    // 400x300 화면 안에서 왼쪽 위(0,0)에 붙은 300x200(3:2) 박스를 se로 크게 확대 —
    // 폭(500)과 높이(333) 둘 다 경계를 넘어서므로 각각 독립적으로 자르면 400x300(4:3)이 되어버린다.
    const base = { x: 0, y: 0, width: 300, height: 200 };
    const rect = resizeRectFromCorner(base, "se", 200, 0, 3 / 2, 400, 300, 40);
    expect(rect.width / rect.height).toBeCloseTo(3 / 2, 2);
    expect(rect.x + rect.width).toBeLessThanOrEqual(400 + 0.01);
    expect(rect.y + rect.height).toBeLessThanOrEqual(300 + 0.01);
  });

  it("nw 방향으로 경계 밖까지 늘려도 비율이 깨지지 않는다", () => {
    const base = { x: 300, y: 300, width: 100, height: 100 };
    const rect = resizeRectFromCorner(base, "nw", -500, -500, 16 / 9, 400, 400, 40);
    expect(rect.width / rect.height).toBeCloseTo(16 / 9, 2);
    expect(rect.x).toBeGreaterThanOrEqual(-0.01);
    expect(rect.y).toBeGreaterThanOrEqual(-0.01);
  });
});

describe("centeredRect", () => {
  it("자유(aspect=null)면 화면 비율에 맞춰 중앙에 90% 크기로 놓인다", () => {
    const rect = centeredRect(400, 300, null);
    expect(rect.width).toBeCloseTo(360, 0);
    expect(rect.x).toBeCloseTo(20, 0);
  });

  it("가로로 넓은 화면에서 세로로 긴 비율(2:3)을 주면 높이 기준으로 맞춘다", () => {
    const rect = centeredRect(400, 300, 2 / 3);
    expect(rect.height).toBeLessThanOrEqual(300);
    expect(rect.width / rect.height).toBeCloseTo(2 / 3, 1);
  });

  it("항상 화면 경계 안에 있다", () => {
    const rect = centeredRect(400, 300, 16 / 9);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(400);
    expect(rect.y + rect.height).toBeLessThanOrEqual(300);
  });
});

describe("scaleRectToNatural — 화면 crop 좌표를 원본 해상도로 변환", () => {
  it("원본이 화면보다 훨씬 크면(예: 3024x4032 원본, 350x470 화면) 좌표가 비례해서 커진다", () => {
    const displayRect = { x: 35, y: 47, width: 175, height: 235 }; // 화면의 중앙 절반쯤
    const natural = scaleRectToNatural(displayRect, 350, 470, 3024, 4032);
    const scaleX = 3024 / 350;
    const scaleY = 4032 / 470;
    expect(natural.x).toBeCloseTo(35 * scaleX, 0);
    expect(natural.y).toBeCloseTo(47 * scaleY, 0);
    expect(natural.width).toBeCloseTo(175 * scaleX, 0);
    expect(natural.height).toBeCloseTo(235 * scaleY, 0);
  });

  it("화면 크기와 원본 크기가 같으면 좌표가 그대로 유지된다", () => {
    const rect = { x: 10, y: 20, width: 100, height: 50 };
    const natural = scaleRectToNatural(rect, 500, 500, 500, 500);
    expect(natural).toEqual(rect);
  });
});
