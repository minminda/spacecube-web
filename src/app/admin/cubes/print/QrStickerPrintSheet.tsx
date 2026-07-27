import { buildQrMatrix } from "@/lib/qrVector";
import { paginate, chunkRows, A4_WIDTH_MM, A4_HEIGHT_MM } from "@/lib/printSheet";
import { CENTER_LOGO_RATIO, CENTER_LOGO_FONT_RATIO, CENTER_LOGO_BORDER_RATIO, CENTER_LOGO_LINES, LINE_GAP_RATIO } from "@/lib/qrLogo";
import {
  QR_CUT_SIZE_MM,
  QR_WORK_SIZE_MM,
  QR_BLEED_MM,
  QR_GRID_COLS,
  QR_GRID_ROWS,
  QR_GAP_MM,
  QR_SIZE_MM,
  QR_QUIET_ZONE_MODULES,
  CUT_LINE_COLOR,
  CUT_LINE_WIDTH_MM,
} from "@/lib/stickerSpec";

export interface PrintCubeInput {
  code: string;
  url: string;
}

/** work 셀(49x49mm) 좌표계 안에서 QR(벡터 모듈) + 중앙 "공간큐브" 로고 + 도무송 칼선을
 * 하나의 SVG로 그린다. viewBox 단위 1 = 1mm로 맞춰(width/height도 "mm" 단위) 브라우저가
 * 화면·인쇄 모두에서 실제 물리 크기 그대로, 손실 없는 벡터로 스케일링하게 한다. */
function QrCellSvg({ url }: { url: string }) {
  const matrix = buildQrMatrix(url, "H");
  const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;

  const cutOffset = QR_BLEED_MM;
  const qrOffset = cutOffset + (QR_CUT_SIZE_MM - QR_SIZE_MM) / 2;
  const centerX = cutOffset + QR_CUT_SIZE_MM / 2;
  const centerY = cutOffset + QR_CUT_SIZE_MM / 2;

  const logoSizeMm = QR_SIZE_MM * CENTER_LOGO_RATIO;
  const strokeWidthMm = Math.max(QR_SIZE_MM * CENTER_LOGO_BORDER_RATIO, 0.15);
  const fontSizeMm = logoSizeMm * CENTER_LOGO_FONT_RATIO;
  const halfGapMm = fontSizeMm * LINE_GAP_RATIO;
  const [line1, line2] = CENTER_LOGO_LINES;

  const modules: React.ReactElement[] = [];
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.isDark(row, col)) continue;
      modules.push(
        <rect
          key={`${row}-${col}`}
          x={col + QR_QUIET_ZONE_MODULES}
          y={row + QR_QUIET_ZONE_MODULES}
          width={1.02}
          height={1.02}
          fill="#111111"
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${QR_WORK_SIZE_MM} ${QR_WORK_SIZE_MM}`}
      width={`${QR_WORK_SIZE_MM}mm`}
      height={`${QR_WORK_SIZE_MM}mm`}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* 도무송 칼선(재단사이즈 기준) — 업체 작업용, 얇은 헤어라인이라 일반 시야에는 눈에 잘 안 띈다 */}
      <rect
        x={cutOffset}
        y={cutOffset}
        width={QR_CUT_SIZE_MM}
        height={QR_CUT_SIZE_MM}
        fill="none"
        stroke={CUT_LINE_COLOR}
        strokeWidth={CUT_LINE_WIDTH_MM}
      />
      {/* 중첩 svg — 자체 viewBox(모듈 단위)를 부모의 mm 좌표계 안에 손실 없이 스케일링 */}
      <svg x={qrOffset} y={qrOffset} width={QR_SIZE_MM} height={QR_SIZE_MM} viewBox={`0 0 ${totalModules} ${totalModules}`}>
        {modules}
      </svg>
      <rect
        x={centerX - logoSizeMm / 2}
        y={centerY - logoSizeMm / 2}
        width={logoSizeMm}
        height={logoSizeMm}
        fill="#ffffff"
        stroke="#111111"
        strokeWidth={strokeWidthMm}
      />
      <text x={centerX} y={centerY - halfGapMm} textAnchor="middle" dominantBaseline="middle" fontFamily="Pretendard, sans-serif" fontWeight={800} fontSize={fontSizeMm} fill="#111111">
        {line1}
      </text>
      <text x={centerX} y={centerY + halfGapMm} textAnchor="middle" dominantBaseline="middle" fontFamily="Pretendard, sans-serif" fontWeight={800} fontSize={fontSizeMm} fill="#111111">
        {line2}
      </text>
    </svg>
  );
}

export default function QrStickerPrintSheet({ cubes }: { cubes: PrintCubeInput[] }) {
  const perPage = QR_GRID_COLS * QR_GRID_ROWS;
  const pages = paginate(cubes, perPage);

  return (
    <>
      {pages.map((page, pageIndex) => {
        const rows = chunkRows(page, QR_GRID_COLS);
        return (
          <div
            key={pageIndex}
            style={{
              width: `${A4_WIDTH_MM}mm`,
              height: `${A4_HEIGHT_MM}mm`,
              display: "flex",
              flexDirection: "column",
              // 행 묶음 전체를 세로로 가운데 정렬(justifyContent)하고, 각 행은 자기 너비
              // 기준으로 가로 가운데 정렬(alignItems)한다 — 마지막 행에 3개보다 적게
              // 남아도 그 행 자체가 페이지 중앙에 오므로 한쪽으로 치우치지 않는다.
              justifyContent: "center",
              alignItems: "center",
              gap: `${QR_GAP_MM}mm`,
              breakAfter: pageIndex < pages.length - 1 ? "page" : "auto",
            }}
          >
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: "flex", flexDirection: "row", gap: `${QR_GAP_MM}mm` }}>
                {row.map((cube) => (
                  <QrCellSvg key={cube.code} url={cube.url} />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
