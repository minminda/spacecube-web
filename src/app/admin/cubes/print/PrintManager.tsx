"use client";

import { useState } from "react";
import Link from "next/link";
import CubeQR from "@/components/CubeQR";
import { buildQrStickerPdf, buildNumberStickerPdf } from "@/lib/stickerPdf";

export interface PrintCube {
  id: string;
  code: string;
  url: string;
}

interface Props {
  cubes: PrintCube[];
}

const PREVIEW_QR_SIZE = 96;

function dateStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export default function PrintManager({ cubes }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(cubes.map((c) => c.id)));
  const [generating, setGenerating] = useState<"qr" | "number" | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(cubes.map((c) => c.id)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  const toPrint = cubes.filter((c) => selected.has(c.id));

  async function downloadQrPdf() {
    if (generating || toPrint.length === 0) return;
    setGenerating("qr");
    try {
      const doc = buildQrStickerPdf(toPrint.map((c) => ({ code: c.code, url: c.url })));
      doc.save(`qr-stickers-${dateStamp()}.pdf`);
    } finally {
      setGenerating(null);
    }
  }

  async function downloadNumberPdf() {
    if (generating || toPrint.length === 0) return;
    setGenerating("number");
    try {
      const doc = buildNumberStickerPdf(toPrint.map((c) => c.code));
      doc.save(`number-stickers-${dateStamp()}.pdf`);
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">QR / 번호 스티커 제작 파일</h1>
          <Link href="/admin/cubes" className="text-xs" style={{ color: "var(--dim)" }}>&lt; 큐브 관리</Link>
        </div>

        {cubes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>인쇄할 큐브가 없어요.</p>
        ) : (
          <>
            <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
              스티커 실제 크기 45×45mm · A4 한 페이지 3열×3행(9개) 자동 분할 · QR은 벡터로 생성되어 확대해도 깨지지 않습니다.
            </p>

            <div className="flex gap-3 flex-wrap text-xs">
              <button type="button" onClick={selectAll} className="border px-3 py-1.5" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>전체 선택</button>
              <button type="button" onClick={selectNone} className="border px-3 py-1.5" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>선택 해제</button>
              <span className="self-center" style={{ color: "var(--dim)" }}>{selected.size} / {cubes.length}개 선택됨</span>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={downloadQrPdf}
                disabled={toPrint.length === 0 || generating !== null}
                className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--fg)" }}
              >
                {generating === "qr" ? "생성 중..." : "[[ QR 스티커 PDF 다운로드 ]]"}
              </button>
              <button
                type="button"
                onClick={downloadNumberPdf}
                disabled={toPrint.length === 0 || generating !== null}
                className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {generating === "number" ? "생성 중..." : "[[ 번호 스티커 PDF 다운로드 ]]"}
              </button>
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {cubes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs p-2 border cursor-pointer" style={{ borderColor: "var(--border)", opacity: selected.has(c.id) ? 1 : 0.4 }}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  {c.code}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 미리보기 — 화면 표시용 래스터 캔버스이며, 실제 다운로드되는 PDF는 항상 벡터로 별도 생성된다 */}
      <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${PREVIEW_QR_SIZE + 40}px, 1fr))` }}>
        {toPrint.map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-2 py-4">
            <CubeQR url={c.url} code={c.code} size={PREVIEW_QR_SIZE} />
            <p className="text-sm font-mono tracking-wide">{c.code}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
