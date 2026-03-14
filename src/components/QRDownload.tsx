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
      width: 220,
      margin: 2,
      color: { dark: "#e0e0d0", light: "#0a0a0a" },
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
      <canvas ref={canvasRef} />
      {ready && (
        <button
          onClick={handleDownload}
          className="text-sm px-4 py-2 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          [[ QR 다운로드 ]]
        </button>
      )}
      <p className="text-xs text-center" style={{ color: "var(--dim)" }}>
        // 이 QR을 큐브에 붙여두면 방문자가 스캔할 수 있어.
      </p>
    </div>
  );
}
