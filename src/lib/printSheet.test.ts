import { describe, it, expect } from "vitest";
import { computeGrid, paginate, PRINTABLE_WIDTH_MM, PRINTABLE_HEIGHT_MM } from "./printSheet";

describe("computeGrid", () => {
  it("셀+간격 크기로 열/행/페이지당 개수를 계산한다", () => {
    // 50mm 셀 + 6mm 간격 — 인쇄 가능 영역(190x277mm) 기준 손계산과 대조
    const grid = computeGrid(50, 65, 6);
    expect(grid.cols).toBe(Math.floor((PRINTABLE_WIDTH_MM + 6) / (50 + 6)));
    expect(grid.rows).toBe(Math.floor((PRINTABLE_HEIGHT_MM + 6) / (65 + 6)));
    expect(grid.perPage).toBe(grid.cols * grid.rows);
  });

  it("셀이 인쇄 영역보다 커도 최소 1x1은 보장한다", () => {
    const grid = computeGrid(500, 500, 6);
    expect(grid.cols).toBe(1);
    expect(grid.rows).toBe(1);
    expect(grid.perPage).toBe(1);
  });

  it("셀이 작을수록 더 많이 들어간다", () => {
    const big = computeGrid(60, 30, 6);
    const small = computeGrid(30, 15, 6);
    expect(small.perPage).toBeGreaterThan(big.perPage);
  });
});

describe("paginate", () => {
  it("빈 배열이면 빈 페이지 1장을 반환한다(레이아웃 미리보기용)", () => {
    expect(paginate([], 9)).toEqual([[]]);
  });

  it("perPage로 정확히 나눠떨어지면 마지막 페이지도 꽉 찬다", () => {
    const items = Array.from({ length: 18 }, (_, i) => i);
    const pages = paginate(items, 9);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(9);
    expect(pages[1]).toHaveLength(9);
  });

  it("나머지가 있으면 마지막 페이지는 남은 개수만큼만", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const pages = paginate(items, 9);
    expect(pages).toHaveLength(3);
    expect(pages[2]).toHaveLength(2);
  });

  it("항목이 perPage보다 적으면 페이지 1장에 전부 담는다", () => {
    const items = [1, 2, 3];
    expect(paginate(items, 9)).toEqual([[1, 2, 3]]);
  });
});
