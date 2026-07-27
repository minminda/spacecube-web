import { describe, it, expect } from "vitest";
import { computeGrid, paginate, A4_WIDTH_MM, A4_HEIGHT_MM } from "./printSheet";

describe("computeGrid", () => {
  it("3x3/45mm/8mm 간격이면 페이지당 9개, 여백은 좌우·상하 대칭이다", () => {
    const grid = computeGrid({ cols: 3, rows: 3, cellSizeMm: 45, gapMm: 8 });
    expect(grid.perPage).toBe(9);
    const usedWidth = 3 * 45 + 2 * 8;
    const usedHeight = 3 * 45 + 2 * 8;
    expect(grid.marginXMm).toBeCloseTo((A4_WIDTH_MM - usedWidth) / 2);
    expect(grid.marginYMm).toBeCloseTo((A4_HEIGHT_MM - usedHeight) / 2);
    expect(grid.marginXMm).toBeGreaterThan(0);
    expect(grid.marginYMm).toBeGreaterThan(0);
  });

  it("열/행 수를 그대로 perPage에 반영한다(자동 최대 채우기 아님)", () => {
    const grid = computeGrid({ cols: 3, rows: 3, cellSizeMm: 45, gapMm: 8 });
    // 45mm 셀은 A4에 3열보다 더 들어갈 수 있어도(예: 4열) 요구사항이 고정 3x3이므로 3을 그대로 써야 한다.
    expect(grid.cols).toBe(3);
    expect(grid.rows).toBe(3);
  });
});

describe("paginate", () => {
  it("빈 배열이면 빈 페이지 목록을 반환한다", () => {
    expect(paginate([], 9)).toEqual([]);
  });

  it("10개를 9개씩 나누면 1페이지 9개 + 2페이지 1개", () => {
    const items = Array.from({ length: 10 }, (_, i) => `GC-${String(i + 1).padStart(3, "0")}`);
    const pages = paginate(items, 9);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual(items.slice(0, 9));
    expect(pages[1]).toEqual(["GC-010"]);
  });

  it("perPage로 정확히 나눠떨어지면 마지막 페이지도 꽉 찬다", () => {
    const items = Array.from({ length: 18 }, (_, i) => i);
    const pages = paginate(items, 9);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(9);
    expect(pages[1]).toHaveLength(9);
  });

  it("항목이 perPage보다 적으면 페이지 1장에 전부 담는다", () => {
    expect(paginate([1, 2, 3], 9)).toEqual([[1, 2, 3]]);
  });
});
