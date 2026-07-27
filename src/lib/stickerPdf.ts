import { jsPDF } from "jspdf";
import { buildQrMatrix } from "./qrVector";
import { computeGrid, computeMaxFitGrid, paginate, type GridLayout } from "./printSheet";
import { BRAND_FONT_BASE64 } from "./brandFont.generated";
import { CENTER_LOGO_RATIO, CENTER_LOGO_FONT_RATIO, CENTER_LOGO_BORDER_RATIO, CENTER_LOGO_LINES, LINE_GAP_RATIO } from "./qrLogo";

/** 도무송(다이컷) 칼선 색상 — 제작 업체 작업가이드 지정값 "M100"(마젠타 100%, 나머지 0%)을
 * 진짜 CMYK 값으로 지정한다. jsPDF의 4인자 setDrawColor/setFillColor는 0~1 소수 스케일을
 * 그대로 K 연산자에 쓰므로(255나 100 스케일이 아님) 반드시 [0,1,0,0]으로 넘겨야 한다. */
const CUT_LINE_CMYK: [number, number, number, number] = [0, 1, 0, 0];
const CUT_LINE_WIDTH_MM = 0.3;

function drawCutLine(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...CUT_LINE_CMYK);
  doc.setLineWidth(CUT_LINE_WIDTH_MM);
  doc.rect(x, y, w, h, "S");
}

// ── QR 스티커 ──────────────────────────────────────────────────────────
/** 재단사이즈(실제 잘려나가는 최종 크기) — 업체 작업가이드 고정값, 임의 조정 금지. */
const QR_CUT_SIZE_MM = 45;
/** 작업사이즈(칼선 둘레 여유 포함 인쇄 캔버스) — 업체 작업가이드 고정값. */
const QR_WORK_SIZE_MM = 49;
/** 재단사이즈 기준 칼선을 셀 중앙에 두기 위한 여백 — (작업사이즈-재단사이즈)/2, 하드코딩 금지. */
const QR_BLEED_MM = (QR_WORK_SIZE_MM - QR_CUT_SIZE_MM) / 2;
const QR_GRID_COLS = 3;
const QR_GRID_ROWS = 3;
/** 작업사이즈 셀 사이 간격 — 도무송 칼선이 있어 손 재단 여유는 불필요, 인접 항목 구분용 최소 여백. */
const QR_GAP_MM = 3;
/** QR 자체 크기 — 재단사이즈(45mm) 안에서의 위치·비율은 기존 디자인 그대로 유지. */
const QR_SIZE_MM = 34;
const QR_QUIET_ZONE_MODULES = 4;

const BRAND_FONT_NAME = "PretendardBrand";
const PT_PER_MM = 72 / 25.4;

function registerBrandFont(doc: jsPDF) {
  doc.addFileToVFS(`${BRAND_FONT_NAME}.ttf`, BRAND_FONT_BASE64);
  doc.addFont(`${BRAND_FONT_NAME}.ttf`, BRAND_FONT_NAME, "normal");
}

/** QR 중앙에 흰 박스+테두리+"공간"/"큐브" 2줄 텍스트를 겹쳐 그린다 — 화면 미리보기(CubeQR/qrLogo.ts)와
 * 완전히 동일한 비율을 그대로 재사용해 미리보기·실제 PDF가 같은 디자인으로 보이게 한다. */
function drawCenterLogo(doc: jsPDF, centerX: number, centerY: number, qrSizeMm: number) {
  const logoSizeMm = qrSizeMm * CENTER_LOGO_RATIO;
  const strokeWidthMm = Math.max(qrSizeMm * CENTER_LOGO_BORDER_RATIO, 0.15);
  const fontSizeMm = logoSizeMm * CENTER_LOGO_FONT_RATIO;
  const halfGapMm = fontSizeMm * LINE_GAP_RATIO;

  doc.setFillColor(255, 255, 255);
  doc.rect(centerX - logoSizeMm / 2, centerY - logoSizeMm / 2, logoSizeMm, logoSizeMm, "F");

  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(strokeWidthMm);
  doc.rect(
    centerX - logoSizeMm / 2 + strokeWidthMm / 2,
    centerY - logoSizeMm / 2 + strokeWidthMm / 2,
    logoSizeMm - strokeWidthMm,
    logoSizeMm - strokeWidthMm,
    "S",
  );

  doc.setFont(BRAND_FONT_NAME, "normal");
  doc.setFontSize(fontSizeMm * PT_PER_MM);
  doc.setTextColor(17, 17, 17);
  const [line1, line2] = CENTER_LOGO_LINES;
  doc.text(line1, centerX, centerY - halfGapMm, { align: "center", baseline: "middle" });
  doc.text(line2, centerX, centerY + halfGapMm, { align: "center", baseline: "middle" });
}

export interface StickerCube {
  code: string;
  url: string;
}

function renderGrid<T>(
  doc: jsPDF,
  items: T[],
  layout: GridLayout,
  cellWidthMm: number,
  cellHeightMm: number,
  gapMm: number,
  drawCell: (doc: jsPDF, item: T, workX: number, workY: number) => void,
) {
  const pages = paginate(items, layout.perPage);
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    page.forEach((item, i) => {
      const col = i % layout.cols;
      const row = Math.floor(i / layout.cols);
      const workX = layout.marginXMm + col * (cellWidthMm + gapMm);
      const workY = layout.marginYMm + row * (cellHeightMm + gapMm);
      drawCell(doc, item, workX, workY);
    });
  });
}

function qrGridLayout(): GridLayout {
  return computeGrid({ cols: QR_GRID_COLS, rows: QR_GRID_ROWS, cellWidthMm: QR_WORK_SIZE_MM, cellHeightMm: QR_WORK_SIZE_MM, gapMm: QR_GAP_MM });
}

/** work 셀(작업사이즈) 안에서 QR(QR 코드 + 중앙 로고) + 도무송 칼선만 그린다 — 코드 텍스트는 없음. */
function drawQrCell(doc: jsPDF, cube: StickerCube, workX: number, workY: number) {
  const cutX = workX + QR_BLEED_MM;
  const cutY = workY + QR_BLEED_MM;

  const matrix = buildQrMatrix(cube.url, "H");
  const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;
  const moduleSizeMm = QR_SIZE_MM / totalModules;
  const qrX = cutX + (QR_CUT_SIZE_MM - QR_SIZE_MM) / 2;
  const qrY = cutY + (QR_CUT_SIZE_MM - QR_SIZE_MM) / 2;

  doc.setFillColor(17, 17, 17);
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.isDark(row, col)) continue;
      const mx = qrX + (col + QR_QUIET_ZONE_MODULES) * moduleSizeMm;
      const my = qrY + (row + QR_QUIET_ZONE_MODULES) * moduleSizeMm;
      // 인접 모듈 사이 흰 실선(hairline gap)이 생기지 않도록 살짝 겹쳐 그린다.
      doc.rect(mx, my, moduleSizeMm + 0.01, moduleSizeMm + 0.01, "F");
    }
  }

  drawCenterLogo(doc, cutX + QR_CUT_SIZE_MM / 2, cutY + QR_CUT_SIZE_MM / 2, QR_SIZE_MM);

  drawCutLine(doc, cutX, cutY, QR_CUT_SIZE_MM, QR_CUT_SIZE_MM);
}

/** QR 스티커 PDF — QR(벡터) + 중앙 로고만 포함, 도무송 칼선(M100) 동봉. */
export function buildQrStickerPdf(cubes: StickerCube[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerBrandFont(doc);
  const layout = qrGridLayout();
  renderGrid(doc, cubes, layout, QR_WORK_SIZE_MM, QR_WORK_SIZE_MM, QR_GAP_MM, drawQrCell);
  return doc;
}

// ── GC 코드 스티커 ─────────────────────────────────────────────────────
/** 재단사이즈 — 업체 작업가이드 고정값. */
const GC_CUT_WIDTH_MM = 20;
const GC_CUT_HEIGHT_MM = 10;
/** 작업사이즈 여백 — 업체가 별도 수치를 지정하지 않아, QR 스티커와 동일한 2mm 블리드를 적용.
 * 업체가 다른 수치를 요구하면 이 상수만 바꾸면 된다. */
const GC_BLEED_MM = 2;
const GC_WORK_WIDTH_MM = GC_CUT_WIDTH_MM + GC_BLEED_MM * 2;
const GC_WORK_HEIGHT_MM = GC_CUT_HEIGHT_MM + GC_BLEED_MM * 2;
/** 셀 사이 간격 — QR 스티커와 동일 기준. */
const GC_GAP_MM = 3;

function gcGridLayout(): GridLayout {
  return computeMaxFitGrid({ cellWidthMm: GC_WORK_WIDTH_MM, cellHeightMm: GC_WORK_HEIGHT_MM, gapMm: GC_GAP_MM });
}

function drawGcCodeCell(doc: jsPDF, code: string, workX: number, workY: number) {
  const cutX = workX + GC_BLEED_MM;
  const cutY = workY + GC_BLEED_MM;
  const centerX = cutX + GC_CUT_WIDTH_MM / 2;
  const centerY = cutY + GC_CUT_HEIGHT_MM / 2;

  const maxWidthMm = GC_CUT_WIDTH_MM - 4; // 재단선에서 2mm씩 안전 여백
  doc.setFont("helvetica", "bold");
  const refSize = 10;
  doc.setFontSize(refSize);
  const refWidth = doc.getTextWidth(code);
  const fontSize = (maxWidthMm / refWidth) * refSize;
  doc.setFontSize(fontSize);
  doc.setTextColor(17, 17, 17);
  doc.text(code, centerX, centerY, { align: "center", baseline: "middle" });

  drawCutLine(doc, cutX, cutY, GC_CUT_WIDTH_MM, GC_CUT_HEIGHT_MM);
}

/** GC 코드 스티커 PDF — QR 없이 코드 텍스트만, A4에 최대한 효율적으로 배치, 도무송 칼선(M100) 동봉. */
export function buildGcCodeStickerPdf(codes: string[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const layout = gcGridLayout();
  renderGrid(doc, codes, layout, GC_WORK_WIDTH_MM, GC_WORK_HEIGHT_MM, GC_GAP_MM, drawGcCodeCell);
  return doc;
}
