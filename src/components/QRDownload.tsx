"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  url: string;
  spaceName: string;
}

export default function QRDownload({ url, spaceName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: { dark: "#1C1C1A", light: "#FAFAF8" },
    }).then(() => setReady(true));
  }, [url]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${spaceName}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} className="rounded-2xl" />
      {ready && (
        <button
          onClick={handleDownload}
          className="px-6 py-2 rounded-full text-sm"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          QR 다운로드
        </button>
      )}
      <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
        이 QR을 큐브에 붙여두면<br />방문자가 스캔할 수 있어.
      </p>
    </div>
  );
}
