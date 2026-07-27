import { describe, it, expect } from "vitest";
import { computeMaxFitGrid, paginate, chunkRows, A4_WIDTH_MM, A4_HEIGHT_MM } from "./printSheet";

describe("computeMaxFitGrid", () => {
  it("셀 크기만으로 페이지에 최대한 많이 들어가는 열/행 수를 역산한다", () => {
    const grid = computeMaxFitGrid(24, 14, 3);
    const expectedCols = Math.floor((A4_WIDTH_MM + 3) / (24 + 3));
    const expectedRows = Math.floor((A4_HEIGHT_MM + 3) / (14 + 3));
    expect(grid.cols).toBe(expectedCols);
    expect(grid.rows).toBe(expectedRows);
    expect(grid.perPage).toBe(expectedCols * expectedRows);
  });

  it("셀이 작을수록 더 많이 들어간다", () => {
    const big = computeMaxFitGrid(60, 30, 3);
    const small = computeMaxFitGrid(24, 14, 3);
    expect(small.perPage).toBeGreaterThan(big.perPage);
  });

  it("셀이 페이지보다 커도 최소 1x1은 보장한다", () => {
    const grid = computeMaxFitGrid(500, 500, 3);
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

describe("chunkRows", () => {
  it("cols개씩 행으로 나누고, 마지막 행은 남는 개수만큼만 담는다", () => {
    const items = Array.from({ length: 7 }, (_, i) => i + 1);
    expect(chunkRows(items, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("정확히 나눠떨어지면 모든 행이 cols개씩 꽉 찬다", () => {
    const items = Array.from({ length: 9 }, (_, i) => i + 1);
    const rows = chunkRows(items, 3);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.length === 3)).toBe(true);
  });

  it("항목이 없으면 빈 배열을 반환한다", () => {
    expect(chunkRows([], 3)).toEqual([]);
  });
});
