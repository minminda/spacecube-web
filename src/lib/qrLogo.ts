/** 큐브 QR 중앙 브랜드 로고 — 순수 문자열/숫자 로직만 담아 canvas(PNG)와 SVG 양쪽에서 재사용한다. */

/** 로고 영역이 QR 전체 너비에서 차지하는 비율(약 15%) — errorCorrectionLevel H(30% 복원)에서 안전한 수준 */
export const CENTER_LOGO_RATIO = 0.15;
export const CENTER_LOGO_LINES: [string, string] = ["공간", "큐브"];
export const CENTER_LOGO_FONT_STACK = `Pretendard, "Malgun Gothic", sans-serif`;

/** qrcode 라이브러리가 만든 SVG 문자열(viewBox="0 0 W H") 안에 중앙 흰색 사각형 + 2줄 텍스트를 주입한다.
 * viewBox 형식이 예상과 다르면(라이브러리 버전 변경 등) 원본을 그대로 반환해 QR 자체는 항상 유지한다. */
export function injectCenterLogoIntoSvg(
  svgMarkup: string,
  options: { ratio?: number; lines?: [string, string] } = {},
): string {
  const ratio = options.ratio ?? CENTER_LOGO_RATIO;
  const [line1, line2] = options.lines ?? CENTER_LOGO_LINES;

  const match = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svgMarkup);
  if (!match) return svgMarkup;

  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  const size = Math.min(w, h) * ratio;
  const cx = w / 2;
  const cy = h / 2;
  const fontSize = size * 0.32;

  const overlay =
    `<rect x="${(cx - size / 2).toFixed(2)}" y="${(cy - size / 2).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" fill="#ffffff"/>` +
    `<text x="${cx.toFixed(2)}" y="${(cy - fontSize * 0.55).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family='${CENTER_LOGO_FONT_STACK}' font-weight="700" font-size="${fontSize.toFixed(2)}" fill="#111111">${line1}</text>` +
    `<text x="${cx.toFixed(2)}" y="${(cy + fontSize * 0.55).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family='${CENTER_LOGO_FONT_STACK}' font-weight="700" font-size="${fontSize.toFixed(2)}" fill="#111111">${line2}</text>`;

  return svgMarkup.replace("</svg>", `${overlay}</svg>`);
}

/** canvas(PNG)용 — QR이 이미 그려진 캔버스 위에 중앙 로고를 덧그린다. */
export function drawCenterLogoOnCanvas(
  canvas: HTMLCanvasElement,
  size: number,
  options: { ratio?: number; lines?: [string, string] } = {},
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ratio = options.ratio ?? CENTER_LOGO_RATIO;
  const [line1, line2] = options.lines ?? CENTER_LOGO_LINES;

  const logoSize = size * ratio;
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontSize = Math.max(logoSize * 0.32, 6);
  ctx.font = `700 ${fontSize}px ${CENTER_LOGO_FONT_STACK}`;
  ctx.fillText(line1, cx, cy - fontSize * 0.55);
  ctx.fillText(line2, cx, cy + fontSize * 0.55);
}
