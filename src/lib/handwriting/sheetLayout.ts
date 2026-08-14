/**
 * EXPERIMENTAL ONLY — 손글씨 샘플 시트 레이아웃.
 * handwriting-service/preprocessing/sheet_layout.py와 반드시 같은 값을 유지해야 한다 —
 * 이 파일은 인쇄 시트를 그리고, 파이썬 쪽은 촬영된 사진을 같은 좌표계로 보정·크롭한다.
 * (두 값이 어긋나면 코너 마커 위치는 맞아도 셀 좌표가 어긋난다.)
 */
export const CANVAS_W = 1200;
export const CANVAS_H = 1697; // A4 세로 비율(1 : 1.414)

export const MARKER_SIZE = 50;
export const MARKERS = {
  tl: [100, 100] as const,
  tr: [1100, 100] as const,
  bl: [100, 1597] as const,
  br: [1100, 1597] as const,
};

export const GRID_LEFT = 100;
export const GRID_TOP = 280;
export const GRID_CELL_W = 235;
export const GRID_CELL_H = 90;
export const GRID_COL_GAP = 20;
export const GRID_ROW_GAP = 17;
export const GRID_COLS = 4;
export const GRID_ROWS = 12;

export function cellRect(index: number): { x0: number; y0: number; x1: number; y1: number } {
  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;
  const x0 = GRID_LEFT + col * (GRID_CELL_W + GRID_COL_GAP);
  const y0 = GRID_TOP + row * (GRID_CELL_H + GRID_ROW_GAP);
  return { x0, y0, x1: x0 + GRID_CELL_W, y1: y0 + GRID_CELL_H };
}
