"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CENTER_LOGO_RATIO, CENTER_LOGO_LINES, injectCenterLogoIntoSvg, drawCenterLogoOnCanvas } from "@/lib/qrLogo";

interface Props {
  url: string;
  code: string;
  /** 캔버스 래스터 픽셀 크기(해상도) — displaySize를 안 주면 화면 표시 크기도 겸한다 */
  size?: number;
  /** 화면/인쇄 표시 크기(CSS 단위 문자열, 예: "45mm") — 주면 래스터(size)는 해상도 확보용으로만 쓰고
   *  실제 보이는 크기는 이 값을 따른다. 인쇄용 mm 단위 스티커 시트에서 고해상도+정확한 물리 크기를
   *  동시에 맞추기 위함(예: size=600, displaySize="45mm"). 안 주면 기존 동작과 동일. */
  displaySize?: string;
  /** PNG/SVG 다운로드·복사 버튼을 함께 보여줄지 (목록 썸네일에서는 false) */
  showActions?: boolean;
}

export default function CubeQR({ url, code, size = 96, displaySize, showActions = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "code" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function drawCanvas() {
      if (!canvasRef.current) return;
      await QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#111111", light: "#ffffff" },
      });
      // 캔버스 텍스트는 폰트가 로드되기 전에 그리면 계속 대체 폰트로 남으므로, 로고 텍스트를
      // 그리기 전에 폰트 로딩이 끝나길 기다린다(Pretendard는 루트 레이아웃에서 <link>로 로드됨).
      await document.fonts.ready.catch(() => {});
      if (cancelled || !canvasRef.current) return;
      drawCenterLogoOnCanvas(canvasRef.current, size, { ratio: CENTER_LOGO_RATIO, lines: CENTER_LOGO_LINES });
    }
    drawCanvas().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  useEffect(() => {
    if (!showActions) return;
    let cancelled = false;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "H", color: { dark: "#111111", light: "#ffffff" } })
      .then((raw) => {
        if (!cancelled) setSvgMarkup(injectCenterLogoIntoSvg(raw, { ratio: CENTER_LOGO_RATIO, lines: CENTER_LOGO_LINES }));
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, showActions]);

  function downloadPng() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${code}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url2 = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${code}.svg`;
    link.href = url2;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url2), 1000);
  }

  async function copy(text: string, kind: "url" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* 클립보드 미지원 브라우저 — 조용히 무시 */
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={size} height={size} style={{ width: displaySize ?? size, height: displaySize ?? size }} />
      {showActions && (
        <div className="flex flex-wrap gap-2 justify-center">
          <button type="button" onClick={downloadPng} className="text-xs px-2 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            PNG
          </button>
          <button type="button" onClick={downloadSvg} disabled={!svgMarkup} className="text-xs px-2 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            SVG
          </button>
          <button type="button" onClick={() => copy(url, "url")} className="text-xs px-2 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            {copied === "url" ? "복사됨 ✓" : "주소 복사"}
          </button>
          <button type="button" onClick={() => copy(code, "code")} className="text-xs px-2 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            {copied === "code" ? "복사됨 ✓" : "코드 복사"}
          </button>
        </div>
      )}
    </div>
  );
}
