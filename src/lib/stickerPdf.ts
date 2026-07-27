import { jsPDF } from "jspdf";
import { buildQrMatrix } from "./qrVector";
import { computeGrid, paginate, type GridLayout } from "./printSheet";
import { BRAND_FONT_BASE64 } from "./brandFont.generated";

/** 스티커 실제 제작 크기 — 요구사항 고정값(45×45mm), 임의 조정 금지. */
const CELL_SIZE_MM = 45;
const GRID_COLS = 3;
const GRID_ROWS = 3;
/** 스티커 사이 간격 — 재단선 없이도 손 재단 여유가 되도록 충분히 넉넉하게. */
const GAP_MM = 8;
/** QR 자체의 quiet zone(격리 여백) — QR 표준 권장값(4모듈)을 그대로 써서 실물 스캔 안정성을 확보. */
const QR_QUIET_ZONE_MODULES = 4;
/** 셀 안에서 QR이 차지하는 정사각형 크기 — 상단 브랜드 캡션을 추가해도 이 값은 절대 줄이지 않는다
 * (QR 위에 텍스트를 얹지 않고 셀 상단에 별도 자리를 내어, QR 자체는 항상 이 크기 그대로 유지된다). */
const QR_SIZE_MM = 34;
/** 상단 "공간큐브" 브랜드 캡션이 차지하는 띠 높이 — QR보다 확실히 작고 눈에 덜 띄게. */
const BRAND_CAPTION_BAND_MM = 5;
/** 하단 코드 텍스트 띠 높이 — 셀 전체(45mm)에서 위 두 값을 뺀 나머지를 그대로 쓴다.
 * QR_SIZE_MM을 나중에 바꾸더라도 세 구간 합이 항상 45mm가 되도록 하드코딩하지 않고 역산한다. */
const CODE_CAPTION_BAND_MM = CELL_SIZE_MM - BRAND_CAPTION_BAND_MM - QR_SIZE_MM;

const BRAND_FONT_NAME = "PretendardBrand";
const BRAND_TEXT = "공간큐브";

function registerBrandFont(doc: jsPDF) {
  doc.addFileToVFS(`${BRAND_FONT_NAME}.ttf`, BRAND_FONT_BASE64);
  doc.addFont(`${BRAND_FONT_NAME}.ttf`, BRAND_FONT_NAME, "normal");
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

  // 상단 "공간큐브" 브랜드 캡션 — QR 위에 얹지 않고 별도 띠에 작게 배치해 QR 인식 영역을 침범하지 않는다.
  doc.setFont(BRAND_FONT_NAME, "normal");
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(BRAND_TEXT, centerX, y + BRAND_CAPTION_BAND_MM / 2, { align: "center", baseline: "middle" });

  const matrix = buildQrMatrix(cube.url, "H");
  const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;
  const moduleSizeMm = QR_SIZE_MM / totalModules;
  const qrX = x + (CELL_SIZE_MM - QR_SIZE_MM) / 2;
  const qrY = y + BRAND_CAPTION_BAND_MM;

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  doc.text(cube.code, centerX, qrY + QR_SIZE_MM + CODE_CAPTION_BAND_MM / 2, { align: "center", baseline: "middle" });
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
