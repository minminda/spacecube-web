/** 스티커 시트 A4 그리드 레이아웃.
 *
 * 도무송(다이컷) 스티커는 "재단사이즈"(실제 잘려나가는 최종 크기)와 "작업사이즈"
 * (그 둘레에 여유를 둔 인쇄 캔버스 크기, 칼선이 씹히거나 인접 항목과 겹치지 않게
 * 하는 안전 여백)가 다르다. 그리드는 항상 "작업사이즈"를 셀 크기로 써서 배치하고,
 * 그 안에서 재단선은 셀 중앙에 재단사이즈 그대로 그린다(cellOrigin 계산 후 호출부에서
 * bleed만큼 오프셋).
 *
 * 두 가지 배치 방식이 있다:
 * - computeGrid: 열/행 수를 고정값으로 받아 여백만 계산(QR 스티커 — "페이지당 정확히
 *   9개(3x3)"가 리터럴 요구사항이라 페이지에 더 들어갈 수 있어도 늘리지 않는다).
 * - computeMaxFitGrid: 셀 크기만 받아 페이지에 최대한 많이 들어가도록 열/행 수를
 *   역산(GC 코드 스티커 — "A4에 최대한 효율적으로 배치"가 요구사항).
 */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export interface GridConfig {
  cols: number;
  rows: number;
  cellWidthMm: number;
  cellHeightMm: number;
  gapMm: number;
}

export interface GridLayout extends GridConfig {
  marginXMm: number;
  marginYMm: number;
  perPage: number;
}

/** 고정된 열/행/셀크기/간격으로 그리드를 A4 페이지 가운데에 배치했을 때의 여백을 계산한다. */
export function computeGrid(config: GridConfig, pageWidthMm = A4_WIDTH_MM, pageHeightMm = A4_HEIGHT_MM): GridLayout {
  const { cols, rows, cellWidthMm, cellHeightMm, gapMm } = config;
  const usedWidth = cols * cellWidthMm + (cols - 1) * gapMm;
  const usedHeight = rows * cellHeightMm + (rows - 1) * gapMm;
  return {
    ...config,
    marginXMm: (pageWidthMm - usedWidth) / 2,
    marginYMm: (pageHeightMm - usedHeight) / 2,
    perPage: cols * rows,
  };
}

export interface MaxFitConfig {
  cellWidthMm: number;
  cellHeightMm: number;
  gapMm: number;
}

/** 셀 크기만으로 페이지에 최대한 많이 들어가는 열/행 수를 역산한 뒤 computeGrid로 여백까지 계산한다. */
export function computeMaxFitGrid(config: MaxFitConfig, pageWidthMm = A4_WIDTH_MM, pageHeightMm = A4_HEIGHT_MM): GridLayout {
  const { cellWidthMm, cellHeightMm, gapMm } = config;
  const cols = Math.max(1, Math.floor((pageWidthMm + gapMm) / (cellWidthMm + gapMm)));
  const rows = Math.max(1, Math.floor((pageHeightMm + gapMm) / (cellHeightMm + gapMm)));
  return computeGrid({ cols, rows, cellWidthMm, cellHeightMm, gapMm }, pageWidthMm, pageHeightMm);
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
