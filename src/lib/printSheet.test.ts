import { describe, it, expect } from "vitest";
import { computeGrid, computeMaxFitGrid, paginate, A4_WIDTH_MM, A4_HEIGHT_MM } from "./printSheet";

describe("computeGrid", () => {
  it("3x3/49mm/3mm 간격이면 페이지당 9개, 여백은 좌우·상하 대칭이다", () => {
    const grid = computeGrid({ cols: 3, rows: 3, cellWidthMm: 49, cellHeightMm: 49, gapMm: 3 });
    expect(grid.perPage).toBe(9);
    const usedWidth = 3 * 49 + 2 * 3;
    const usedHeight = 3 * 49 + 2 * 3;
    expect(grid.marginXMm).toBeCloseTo((A4_WIDTH_MM - usedWidth) / 2);
    expect(grid.marginYMm).toBeCloseTo((A4_HEIGHT_MM - usedHeight) / 2);
    expect(grid.marginXMm).toBeGreaterThan(0);
    expect(grid.marginYMm).toBeGreaterThan(0);
  });

  it("열/행 수를 그대로 perPage에 반영한다(자동 최대 채우기 아님)", () => {
    const grid = computeGrid({ cols: 3, rows: 3, cellWidthMm: 49, cellHeightMm: 49, gapMm: 3 });
    // 49mm 셀은 A4에 3열보다 더 들어갈 수 있어도(예: 4열) 요구사항이 고정 3x3이므로 3을 그대로 써야 한다.
    expect(grid.cols).toBe(3);
    expect(grid.rows).toBe(3);
  });

  it("직사각형 셀(가로≠세로)도 지원한다", () => {
    const grid = computeGrid({ cols: 2, rows: 5, cellWidthMm: 24, cellHeightMm: 14, gapMm: 3 });
    expect(grid.perPage).toBe(10);
    expect(grid.marginXMm).toBeGreaterThan(0);
    expect(grid.marginYMm).toBeGreaterThan(0);
  });
});

describe("computeMaxFitGrid", () => {
  it("셀 크기만으로 페이지에 최대한 많이 들어가는 열/행 수를 역산한다", () => {
    const grid = computeMaxFitGrid({ cellWidthMm: 24, cellHeightMm: 14, gapMm: 3 });
    const expectedCols = Math.floor((A4_WIDTH_MM + 3) / (24 + 3));
    const expectedRows = Math.floor((A4_HEIGHT_MM + 3) / (14 + 3));
    expect(grid.cols).toBe(expectedCols);
    expect(grid.rows).toBe(expectedRows);
    expect(grid.perPage).toBe(expectedCols * expectedRows);
  });

  it("셀이 작을수록 더 많이 들어간다", () => {
    const big = computeMaxFitGrid({ cellWidthMm: 60, cellHeightMm: 30, gapMm: 3 });
    const small = computeMaxFitGrid({ cellWidthMm: 24, cellHeightMm: 14, gapMm: 3 });
    expect(small.perPage).toBeGreaterThan(big.perPage);
  });

  it("셀이 페이지보다 커도 최소 1x1은 보장한다", () => {
    const grid = computeMaxFitGrid({ cellWidthMm: 500, cellHeightMm: 500, gapMm: 3 });
    expect(grid.cols).toBe(1);
    expect(grid.rows).toBe(1);
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
