/** 도무송(다이컷) 스티커 제작 규격 — QR 스티커/GC 코드 스티커 두 인쇄 화면이 공유하는
 * 치수 상수. "재단사이즈"(실제 잘려나가는 최종 크기)와 "작업사이즈"(칼선 둘레 여유를
 * 더한 인쇄 캔버스)를 구분해서 관리한다. */

// ── QR 스티커 ──────────────────────────────────────────────────────────
export const QR_CUT_SIZE_MM = 45;
export const QR_WORK_SIZE_MM = 49;
/** 재단선을 작업 셀 중앙에 두기 위한 여백 — (작업사이즈-재단사이즈)/2, 하드코딩 금지. */
export const QR_BLEED_MM = (QR_WORK_SIZE_MM - QR_CUT_SIZE_MM) / 2;
export const QR_GRID_COLS = 3;
export const QR_GRID_ROWS = 3;
export const QR_GAP_MM = 3;
/** QR 자체 크기 — 재단사이즈(45mm) 안에서의 위치·비율은 기존 디자인 그대로 유지. */
export const QR_SIZE_MM = 34;
export const QR_QUIET_ZONE_MODULES = 4;

// ── GC 코드 스티커 ─────────────────────────────────────────────────────
export const GC_CUT_WIDTH_MM = 20;
export const GC_CUT_HEIGHT_MM = 10;
/** 작업사이즈 여백 — 업체가 별도 수치를 지정하지 않아 QR 스티커와 동일한 블리드를 적용. */
export const GC_BLEED_MM = 2;
export const GC_WORK_WIDTH_MM = GC_CUT_WIDTH_MM + GC_BLEED_MM * 2;
export const GC_WORK_HEIGHT_MM = GC_CUT_HEIGHT_MM + GC_BLEED_MM * 2;
export const GC_GAP_MM = 3;
/** 코드 텍스트 좌우 안전 여백 — 재단 오차로 텍스트가 잘리지 않도록 2mm → 3mm로 확대. */
export const GC_TEXT_MARGIN_MM = 3;

// ── 도무송 칼선(cut line) ──────────────────────────────────────────────
/** 업체 작업가이드 지정 색상은 CMYK M100(마젠타 100%)이지만, 브라우저 인쇄(window.print)
 * 경로는 항상 화면 RGB로만 렌더링되어 진짜 CMYK 별색 분판을 보장할 수 없다. 그래서
 * 색상 관례(마젠타)는 그대로 따르되, 일반 사용자 눈에 디자인 요소로 보이지 않도록
 * 아주 얇은 헤어라인 두께로 그린다 — 업체는 이 얇은 마젠타 선을 칼선으로 그대로
 * 인식해 사용할 수 있다. */
export const CUT_LINE_COLOR = "#ff00ff";
export const CUT_LINE_WIDTH_MM = 0.15;
