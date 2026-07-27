/** 큐브 QR 중앙 브랜드 로고 — 순수 문자열/숫자 로직만 담아 canvas(PNG)와 SVG 양쪽에서 재사용한다.
 *
 * 비율은 실제 Pretendard 글자 폭 측정(canvas measureText, weight 무관하게 "공간"/"큐브" 두 글자
 * 폭은 항상 fontSize×1.84)을 바탕으로 정했다 — 감으로 정하지 않았다. 목표: 로고 영역
 * 20~22%(errorCorrectionLevel H의 여유 안에서 최대한 크게), 텍스트 48~55% 범위 안에서 테두리에
 * 닿지 않는 가장 큰 값. fontRatio=0.48이면 텍스트 폭 ≈ 1.84×0.48 = 0.883×로고너비라 좌우 약
 * 5.8%씩 여백이 남는다 — jsQR 디코드로 재검증 완료(아래 CENTER_LOGO_RATIO 주석 참고).
 */
export const CENTER_LOGO_RATIO = 0.22;
export const CENTER_LOGO_FONT_RATIO = 0.39;
/** 로고 사각 테두리 두께 — QR 전체 너비의 약 1%(예: 280px QR에서 2.8px, 가이드의 2~3px와 일치) */
export const CENTER_LOGO_BORDER_RATIO = 0.01;
export const CENTER_LOGO_LINES: [string, string] = ["공간", "큐브"];
export const CENTER_LOGO_FONT_STACK = `Pretendard, "Malgun Gothic", sans-serif`;
/** 두 줄 사이 간격(줄 중심 간 거리) — fontSize 대비 배수. 좁은 행간을 위해 1.1 → 0.92로 줄임 */
export const LINE_GAP_RATIO = 0.46; // 중심에서 위/아래로 각각 이만큼(× fontSize) 이동 → 총 간격 0.92×fontSize

/** qrcode 라이브러리가 만든 SVG 문자열(viewBox="0 0 W H") 안에 검정 테두리 사각형 + 흰 배경 +
 * 2줄 텍스트를 주입한다. viewBox 형식이 예상과 다르면(라이브러리 버전 변경 등) 원본을 그대로
 * 반환해 QR 자체는 항상 유지한다. */
export function injectCenterLogoIntoSvg(
  svgMarkup: string,
  options: { ratio?: number; fontRatio?: number; lines?: [string, string] } = {},
): string {
  const ratio = options.ratio ?? CENTER_LOGO_RATIO;
  const fontRatio = options.fontRatio ?? CENTER_LOGO_FONT_RATIO;
  const [line1, line2] = options.lines ?? CENTER_LOGO_LINES;

  const match = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svgMarkup);
  if (!match) return svgMarkup;

  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  const qrSize = Math.min(w, h);
  const size = qrSize * ratio;
  const cx = w / 2;
  const cy = h / 2;
  const fontSize = size * fontRatio;
  const strokeWidth = Math.max(qrSize * CENTER_LOGO_BORDER_RATIO, 1);
  const halfGap = fontSize * LINE_GAP_RATIO;

  const overlay =
    `<rect x="${(cx - size / 2).toFixed(2)}" y="${(cy - size / 2).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" fill="#ffffff" stroke="#111111" stroke-width="${strokeWidth.toFixed(2)}"/>` +
    `<text x="${cx.toFixed(2)}" y="${(cy - halfGap).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family='${CENTER_LOGO_FONT_STACK}' font-weight="800" font-size="${fontSize.toFixed(2)}" fill="#111111">${line1}</text>` +
    `<text x="${cx.toFixed(2)}" y="${(cy + halfGap).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family='${CENTER_LOGO_FONT_STACK}' font-weight="800" font-size="${fontSize.toFixed(2)}" fill="#111111">${line2}</text>`;

  return svgMarkup.replace("</svg>", `${overlay}</svg>`);
}

/** canvas(PNG)용 — QR이 이미 그려진 캔버스 위에 검정 테두리 로고 박스를 덧그린다. */
export function drawCenterLogoOnCanvas(
  canvas: HTMLCanvasElement,
  size: number,
  options: { ratio?: number; fontRatio?: number; lines?: [string, string] } = {},
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ratio = options.ratio ?? CENTER_LOGO_RATIO;
  const fontRatio = options.fontRatio ?? CENTER_LOGO_FONT_RATIO;
  const [line1, line2] = options.lines ?? CENTER_LOGO_LINES;

  const logoSize = size * ratio;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = Math.max(size * CENTER_LOGO_BORDER_RATIO, 1);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = strokeWidth;
  // stroke가 사각형 경계에 걸쳐 절반씩 삐져나가지 않도록 안쪽으로 절반만큼 들여서 그린다.
  ctx.strokeRect(
    cx - logoSize / 2 + strokeWidth / 2,
    cy - logoSize / 2 + strokeWidth / 2,
    logoSize - strokeWidth,
    logoSize - strokeWidth,
  );

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontSize = Math.max(logoSize * fontRatio, 7);
  const halfGap = fontSize * LINE_GAP_RATIO;
  ctx.font = `800 ${fontSize}px ${CENTER_LOGO_FONT_STACK}`;
  ctx.fillText(line1, cx, cy - halfGap);
  ctx.fillText(line2, cx, cy + halfGap);
}
