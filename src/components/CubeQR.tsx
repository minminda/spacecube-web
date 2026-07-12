"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  url: string;
  code: string;
  /** 캔버스 픽셀 크기 */
  size?: number;
  /** PNG/SVG 다운로드·복사 버튼을 함께 보여줄지 (목록 썸네일에서는 false) */
  showActions?: boolean;
}

export default function CubeQR({ url, code, size = 96, showActions = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "code" | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        color: { dark: "#111111", light: "#ffffff" },
      }).catch(() => {});
    }
    if (showActions) {
      QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#111111", light: "#ffffff" } })
        .then(setSvgMarkup)
        .catch(() => setSvgMarkup(null));
    }
  }, [url, size, showActions]);

  function downloadPng() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `spacecube-${code}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url2 = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `spacecube-${code}.svg`;
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
      <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />
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
