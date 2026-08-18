import { describe, it, expect } from "vitest";
import { classifyOrientation, layoutSceneImages, REFERENCE_HEIGHT, type SceneImageMeta } from "./sceneImageLayout";

function img(url: string, width: number, height: number): SceneImageMeta {
  return { imageUrl: url, width, height };
}

describe("classifyOrientation", () => {
  it("가로가 뚜렷하게 넓으면 landscape", () => {
    expect(classifyOrientation(1500, 1000)).toBe("landscape"); // 3:2
    expect(classifyOrientation(1920, 1080)).toBe("landscape"); // 16:9
  });

  it("세로가 뚜렷하게 길면 portrait", () => {
    expect(classifyOrientation(1000, 1500)).toBe("portrait"); // 2:3
    expect(classifyOrientation(1080, 1920)).toBe("portrait"); // 9:16
  });

  it("거의 정사각형이면 square", () => {
    expect(classifyOrientation(1000, 1000)).toBe("square");
    expect(classifyOrientation(1050, 1000)).toBe("square"); // 약간의 오차는 square로 취급
  });
});

describe("layoutSceneImages — 1장", () => {
  it("landscape 1장은 단독 행, REFERENCE_HEIGHT를 기준으로 폭이 자동 계산된다", () => {
    const rows = layoutSceneImages([img("A", 1500, 1000)]); // 3:2
    expect(rows).toHaveLength(1);
    expect(rows[0].images).toHaveLength(1);
    expect(rows[0].images[0].renderHeight).toBe(REFERENCE_HEIGHT);
    expect(rows[0].images[0].renderWidth).toBeCloseTo(REFERENCE_HEIGHT * 1.5, 0);
  });

  it("portrait 1장도 단독 행, 비율 그대로 좁게 계산된다(옆에 빈 공간)", () => {
    const rows = layoutSceneImages([img("A", 1000, 1500)]); // 2:3
    expect(rows).toHaveLength(1);
    expect(rows[0].images[0].renderHeight).toBe(REFERENCE_HEIGHT);
    expect(rows[0].images[0].renderWidth).toBeCloseTo(REFERENCE_HEIGHT * (2 / 3), 0);
  });
});

describe("layoutSceneImages — 2장", () => {
  it("portrait + portrait는 한 행에 나란히, 각자 비율을 유지한다", () => {
    const rows = layoutSceneImages([img("A", 1000, 1500), img("B", 1200, 1600)]); // 2:3, 3:4
    expect(rows).toHaveLength(1);
    expect(rows[0].images).toHaveLength(2);
    const [a, b] = rows[0].images;
    expect(a.renderHeight).toBe(b.renderHeight); // 같은 행은 공유 높이
    expect(a.renderWidth / a.renderHeight).toBeCloseTo(1000 / 1500, 1);
    expect(b.renderWidth / b.renderHeight).toBeCloseTo(1200 / 1600, 1);
    expect(a.renderWidth).not.toBe(b.renderWidth); // 비율이 다르면 폭도 다르다(강제로 안 맞춤)
  });

  it("두 정사각형처럼 폭 합이 콘텐츠 폭을 넘을 수 있는 조합은 공유 높이를 줄여 넘치지 않게 한다", () => {
    const rows = layoutSceneImages([img("A", 1000, 1000), img("B", 1000, 1000)]);
    const [a, b] = rows[0].images;
    expect(a.renderHeight).toBeLessThan(REFERENCE_HEIGHT); // 꽉 채우면 220px보다 커지므로 줄어들어야 함
    expect(a.renderWidth + b.renderWidth + 8).toBeLessThanOrEqual(320 + 1);
  });

  it("landscape + portrait는 각각 단독 행(같은 행에 억지로 넣지 않음)", () => {
    const rows = layoutSceneImages([img("A", 1500, 1000), img("B", 1000, 1500)]);
    expect(rows).toHaveLength(2);
    expect(rows[0].images).toHaveLength(1);
    expect(rows[1].images).toHaveLength(1);
  });

  it("landscape + landscape도 각각 단독 행", () => {
    const rows = layoutSceneImages([img("A", 1500, 1000), img("B", 1920, 1080)]);
    expect(rows).toHaveLength(2);
  });
});

describe("layoutSceneImages — 3장", () => {
  it("landscape + portrait + portrait → 가로 단독 행 + 세로 2장 나란히 행", () => {
    const rows = layoutSceneImages([img("A", 1500, 1000), img("B", 1000, 1500), img("C", 1100, 1600)]);
    expect(rows).toHaveLength(2);
    expect(rows[0].images).toHaveLength(1); // landscape 단독
    expect(rows[1].images).toHaveLength(2); // portrait 2장
  });

  it("portrait + portrait + portrait → 2장 나란히 + 1장 단독(억지로 3장 한 행에 넣지 않음)", () => {
    const rows = layoutSceneImages([img("A", 1000, 1500), img("B", 1100, 1600), img("C", 900, 1400)]);
    expect(rows).toHaveLength(2);
    expect(rows[0].images).toHaveLength(2);
    expect(rows[1].images).toHaveLength(1);
  });

  it("portrait + landscape + portrait → 각자 단독 행 3개(연속되지 않은 narrow는 안 묶임)", () => {
    const rows = layoutSceneImages([img("A", 1000, 1500), img("B", 1500, 1000), img("C", 1000, 1500)]);
    expect(rows).toHaveLength(3);
    rows.forEach((r) => expect(r.images).toHaveLength(1));
  });
});

describe("layoutSceneImages — 빈 배열", () => {
  it("이미지가 없으면 빈 행 목록", () => {
    expect(layoutSceneImages([])).toEqual([]);
  });
});
