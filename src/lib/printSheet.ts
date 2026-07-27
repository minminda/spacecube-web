/* ── 스티커 시트 A4 인쇄 페이지네이션 ────────────────────────────────────
   50×50mm 미만 스티커는 제작 업체가 개별 재단할 수 없어, "A4 시트 안에
   여러 스티커를 배치 → 업체가 시트째 제작 → 필요한 만큼 떼어 쓴다" 방식으로
   만들어야 한다. 이 파일은 그 시트 레이아웃(한 페이지에 몇 개가 들어가는지,
   전체 목록을 몇 페이지로 나눌지)만 계산하는 순수 함수 — QR 스티커
   화면(PrintManager)과 번호 스티커 화면(CodeStickerManager)이 공유한다. ── */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
/** 인쇄 여백 — @page{margin:0}로 브라우저 기본 여백을 지우고 이 값을 페이지 자체 패딩으로 준다. */
export const PAGE_MARGIN_MM = 10;
export const PRINTABLE_WIDTH_MM = A4_WIDTH_MM - PAGE_MARGIN_MM * 2;
export const PRINTABLE_HEIGHT_MM = A4_HEIGHT_MM - PAGE_MARGIN_MM * 2;

export interface PrintGrid {
  cols: number;
  rows: number;
  perPage: number;
}

/** 셀 크기(mm)+간격(mm)이 주어졌을 때 A4 한 장에 들어가는 열/행/총 개수를 계산한다. */
export function computeGrid(cellWidthMm: number, cellHeightMm: number, gapMm: number): PrintGrid {
  const cols = Math.max(1, Math.floor((PRINTABLE_WIDTH_MM + gapMm) / (cellWidthMm + gapMm)));
  const rows = Math.max(1, Math.floor((PRINTABLE_HEIGHT_MM + gapMm) / (cellHeightMm + gapMm)));
  return { cols, rows, perPage: cols * rows };
}

/** 전체 항목을 perPage개씩 페이지로 나눈다. 항목이 없어도 빈 페이지 1장을 반환한다(레이아웃 미리보기용). */
export function paginate<T>(items: T[], perPage: number): T[][] {
  if (items.length === 0) return [[]];
  const safePerPage = Math.max(1, perPage);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += safePerPage) {
    pages.push(items.slice(i, i + safePerPage));
  }
  return pages;
}
