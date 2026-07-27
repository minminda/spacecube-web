import { jsPDF } from "jspdf";
import { buildQrMatrix } from "./qrVector";
import { computeGrid, paginate, type GridLayout } from "./printSheet";
import { BRAND_FONT_BASE64 } from "./brandFont.generated";
import { CENTER_LOGO_RATIO, CENTER_LOGO_FONT_RATIO, CENTER_LOGO_BORDER_RATIO, CENTER_LOGO_LINES, LINE_GAP_RATIO } from "./qrLogo";

/** 스티커 실제 제작 크기 — 요구사항 고정값(45×45mm), 임의 조정 금지. */
const CELL_SIZE_MM = 45;
const GRID_COLS = 3;
const GRID_ROWS = 3;
/** 스티커 사이 간격 — 재단선 없이도 손 재단 여유가 되도록 충분히 넉넉하게. */
const GAP_MM = 8;
/** QR 자체의 quiet zone(격리 여백) — QR 표준 권장값(4모듈)을 그대로 써서 실물 스캔 안정성을 확보. */
const QR_QUIET_ZONE_MODULES = 4;
/** 셀 안에서 QR이 차지하는 정사각형 크기 — 중앙 브랜드 로고는 이 정사각형 위에 겹쳐 그려질 뿐
 * QR 자체 크기를 줄이지 않는다(qrLogo.ts와 동일하게 H급 에러정정 여유 안에서 중앙 22%만 덮음). */
const QR_SIZE_MM = 34;

const BRAND_FONT_NAME = "PretendardBrand";
/** mm 단위 실측값을 jsPDF의 setFontSize(pt 고정)로 넘기기 위한 변환 계수. */
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

function gridLayout(): GridLayout {
  return computeGrid({ cols: GRID_COLS, rows: GRID_ROWS, cellSizeMm: CELL_SIZE_MM, gapMm: GAP_MM });
}

function cellOrigin(layout: GridLayout, index: number): { x: number; y: number } {
  const col = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  return {
    x: layout.marginXMm + col * (CELL_SIZE_MM + GAP_MM),
    y: layout.marginYMm + row * (CELL_SIZE_MM + GAP_MM),
  };
}

function drawQrCell(doc: jsPDF, cube: StickerCube, x: number, y: number) {
  const centerX = x + CELL_SIZE_MM / 2;
  const matrix = buildQrMatrix(cube.url, "H");
  const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;
  const moduleSizeMm = QR_SIZE_MM / totalModules;
  const qrX = x + (CELL_SIZE_MM - QR_SIZE_MM) / 2;
  const qrY = y + 3;

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

  // QR 중앙 22% 영역에 브랜드 로고를 겹쳐 그린다 — QR 정사각형 크기(QR_SIZE_MM) 자체는 그대로 유지.
  drawCenterLogo(doc, qrX + QR_SIZE_MM / 2, qrY + QR_SIZE_MM / 2, QR_SIZE_MM);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  doc.text(cube.code, centerX, qrY + QR_SIZE_MM + 5.5, { align: "center", baseline: "middle" });
}

function drawNumberCell(doc: jsPDF, code: string, x: number, y: number) {
  const maxWidthMm = CELL_SIZE_MM - 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("CUBE NO.", x + CELL_SIZE_MM / 2, y + 10, { align: "center", baseline: "middle" });

  doc.setFont("helvetica", "bold");
  const refSize = 10;
  doc.setFontSize(refSize);
  const refWidth = doc.getTextWidth(code);
  const fittedSize = (maxWidthMm / refWidth) * refSize;
  const fontSize = Math.min(fittedSize, 30);
  doc.setFontSize(fontSize);
  doc.setTextColor(17, 17, 17);
  doc.text(code, x + CELL_SIZE_MM / 2, y + CELL_SIZE_MM / 2 + 5, { align: "center", baseline: "middle" });
}

function renderPages<T>(doc: jsPDF, items: T[], drawCell: (doc: jsPDF, item: T, x: number, y: number) => void) {
  const layout = gridLayout();
  const pages = paginate(items, layout.perPage);
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    page.forEach((item, i) => {
      const { x, y } = cellOrigin(layout, i);
      drawCell(doc, item, x, y);
    });
  });
}

/** QR 스티커 PDF — QR(벡터 사각형) + 큐브 코드만 포함. */
export function buildQrStickerPdf(cubes: StickerCube[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerBrandFont(doc);
  renderPages(doc, cubes, drawQrCell);
  return doc;
}

/** 큐브 번호 스티커 PDF — QR 없이 큐브 코드만, 큐브 반대편(바닥면) 부착용. */
export function buildNumberStickerPdf(codes: string[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  renderPages(doc, codes, drawNumberCell);
  return doc;
}
