/** 스티커 시트 A4 그리드 레이아웃 — 셀 크기·열/행 수가 고정된 실제 제작 규격
 * (45×45mm, 3열×3행 = 페이지당 9개)을 기준으로 페이지 안에서 그리드를 가운데
 * 정렬하기 위한 여백만 계산한다. 열/행 수를 페이지 크기에서 역산하지 않는 이유:
 * 스티커 실제 크기(45mm)가 고정이라 A4 안에 더 많이 채워 넣을 수 있어도(예: 3×6)
 * 제작 업체와 합의한 규격은 "한 페이지 9개"이므로 그리드 수 자체가 요구사항이다. */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export interface GridConfig {
  cols: number;
  rows: number;
  cellSizeMm: number;
  gapMm: number;
}

export interface GridLayout extends GridConfig {
  marginXMm: number;
  marginYMm: number;
  perPage: number;
}

/** 고정된 열/행/셀크기/간격으로 그리드를 A4 페이지 가운데에 배치했을 때의 여백을 계산한다. */
export function computeGrid(config: GridConfig, pageWidthMm = A4_WIDTH_MM, pageHeightMm = A4_HEIGHT_MM): GridLayout {
  const { cols, rows, cellSizeMm, gapMm } = config;
  const usedWidth = cols * cellSizeMm + (cols - 1) * gapMm;
  const usedHeight = rows * cellSizeMm + (rows - 1) * gapMm;
  return {
    ...config,
    marginXMm: (pageWidthMm - usedWidth) / 2,
    marginYMm: (pageHeightMm - usedHeight) / 2,
    perPage: cols * rows,
  };
}

/** 전체 항목을 perPage개씩 페이지로 나눈다. 항목이 없으면 빈 배열을 반환한다. */
export function paginate<T>(items: T[], perPage: number): T[][] {
  if (perPage <= 0 || items.length === 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}
