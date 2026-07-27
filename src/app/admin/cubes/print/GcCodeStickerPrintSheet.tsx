import { computeMaxFitGrid, paginate, A4_WIDTH_MM, A4_HEIGHT_MM } from "@/lib/printSheet";
import { GC_CUT_WIDTH_MM, GC_CUT_HEIGHT_MM, GC_BLEED_MM, GC_WORK_WIDTH_MM, GC_WORK_HEIGHT_MM, GC_GAP_MM, GC_TEXT_MARGIN_MM, CUT_LINE_COLOR, CUT_LINE_WIDTH_MM } from "@/lib/stickerSpec";

/** work 셀(24x10+블리드mm) 좌표계 안에 도무송 칼선(재단사이즈 기준) + 코드 텍스트만 그린다.
 * 텍스트는 `textLength`+`lengthAdjust="spacingAndGlyphs"`로 좌우 안전 여백을 뺀 폭에
 * 정확히 맞춰(폰트/브라우저 차이와 무관하게 항상 동일한 폭으로) 재단 오차로 잘리지 않게 한다. */
function GcCodeCellSvg({ code }: { code: string }) {
  const cutX = GC_BLEED_MM;
  const cutY = GC_BLEED_MM;
  const centerX = cutX + GC_CUT_WIDTH_MM / 2;
  const centerY = cutY + GC_CUT_HEIGHT_MM / 2;
  const safeTextWidthMm = GC_CUT_WIDTH_MM - GC_TEXT_MARGIN_MM * 2;

  return (
    <svg
      viewBox={`0 0 ${GC_WORK_WIDTH_MM} ${GC_WORK_HEIGHT_MM}`}
      width={`${GC_WORK_WIDTH_MM}mm`}
      height={`${GC_WORK_HEIGHT_MM}mm`}
      style={{ display: "block", overflow: "visible" }}
    >
      <rect x={cutX} y={cutY} width={GC_CUT_WIDTH_MM} height={GC_CUT_HEIGHT_MM} fill="none" stroke={CUT_LINE_COLOR} strokeWidth={CUT_LINE_WIDTH_MM} />
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight={700}
        fontSize={5}
        textLength={safeTextWidthMm}
        lengthAdjust="spacingAndGlyphs"
        fill="#111111"
      >
        {code}
      </text>
    </svg>
  );
}

export default function GcCodeStickerPrintSheet({ codes }: { codes: string[] }) {
  const layout = computeMaxFitGrid({ cellWidthMm: GC_WORK_WIDTH_MM, cellHeightMm: GC_WORK_HEIGHT_MM, gapMm: GC_GAP_MM });
  const pages = paginate(codes, layout.perPage);

  return (
    <>
      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          style={{
            width: `${A4_WIDTH_MM}mm`,
            height: `${A4_HEIGHT_MM}mm`,
            position: "relative",
            breakAfter: pageIndex < pages.length - 1 ? "page" : "auto",
          }}
        >
          {page.map((code, i) => {
            const col = i % layout.cols;
            const row = Math.floor(i / layout.cols);
            const left = layout.marginXMm + col * (GC_WORK_WIDTH_MM + GC_GAP_MM);
            const top = layout.marginYMm + row * (GC_WORK_HEIGHT_MM + GC_GAP_MM);
            return (
              <div key={code} style={{ position: "absolute", left: `${left}mm`, top: `${top}mm` }}>
                <GcCodeCellSvg code={code} />
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
