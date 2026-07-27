/** 스티커 시트 그리드 계산 — 순수하게 "셀 크기+간격이 주어졌을 때 페이지에 몇 열/행이
 * 들어가는지"만 계산한다. 실제 페이지 안에서의 정렬(중앙 정렬, 여백)은 더 이상 여기서
 * mm 좌표로 미리 계산하지 않는다 — CSS Grid(`justify-content/align-content: center`)가
 * 매 페이지마다 실제로 채워진 항목 수에 맞춰 자동으로 중앙 정렬하도록 렌더링 쪽에 맡긴다.
 *
 * 이전엔 여기서 marginXMm/marginYMm까지 계산해 각 셀을 절대좌표(position:absolute)로
 * 배치했는데, 그 방식은 "페이지가 꽉 찼을 때" 기준으로만 여백을 계산해서 마지막 페이지에
 * 항목이 적게 남으면(예: 9개 중 1개) 그 여백 그대로 좌상단에 남아 화면이 한쪽으로
 * 심하게 치우쳐 보이는 문제가 있었다. CSS Grid는 그 페이지에 실제로 있는 항목 수만큼의
 * 트랙만 채워 그 블록 자체를 중앙에 두므로 이 문제가 구조적으로 발생하지 않는다.
 */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export interface GridDimensions {
  cols: number;
  rows: number;
  perPage: number;
}

/** 셀 크기만으로 페이지에 최대한 많이 들어가는 열/행 수를 역산한다(GC 코드 스티커 —
 * "A4에 최대한 효율적으로 배치"). */
export function computeMaxFitGrid(
  cellWidthMm: number,
  cellHeightMm: number,
  gapMm: number,
  pageWidthMm = A4_WIDTH_MM,
  pageHeightMm = A4_HEIGHT_MM,
): GridDimensions {
  const cols = Math.max(1, Math.floor((pageWidthMm + gapMm) / (cellWidthMm + gapMm)));
  const rows = Math.max(1, Math.floor((pageHeightMm + gapMm) / (cellHeightMm + gapMm)));
  return { cols, rows, perPage: cols * rows };
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

/** 한 페이지 분량을 cols개씩 행으로 나눈다. 렌더링 쪽에서 각 행을 독립된 flex row로
 * 그려야 마지막 행(항목 수가 cols보다 적은 행)도 자기 폭 기준으로 중앙 정렬된다 —
 * 페이지 전체를 하나의 고정 열 그리드로 그리면 마지막 행이 항상 왼쪽으로 쏠린다. */
export function chunkRows<T>(items: T[], cols: number): T[][] {
  if (cols <= 0 || items.length === 0) return [];
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }
  return rows;
}
