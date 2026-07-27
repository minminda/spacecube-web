"use client";

import { useState } from "react";
import Link from "next/link";
import CubeQR from "@/components/CubeQR";

export interface PrintCube {
  id: string;
  code: string;
  url: string;
}

interface Props {
  cubes: PrintCube[];
}

const SIZE_OPTIONS = [
  { label: "작게", value: 96 },
  { label: "보통", value: 140 },
  { label: "크게", value: 200 },
] as const;

export default function PrintManager({ cubes }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(cubes.map((c) => c.id)));
  const [qrSize, setQrSize] = useState<number>(140);
  const [showCode, setShowCode] = useState(true);

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

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <div className="no-print flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">QR 인쇄</h1>
          <Link href="/admin/cubes" className="text-xs" style={{ color: "var(--dim)" }}>&lt; 큐브 관리</Link>
        </div>

        {cubes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>인쇄할 큐브가 없어요.</p>
        ) : (
          <>
            <div className="flex gap-3 flex-wrap text-xs">
              <button type="button" onClick={selectAll} className="border px-3 py-1.5" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>전체 선택</button>
              <button type="button" onClick={selectNone} className="border px-3 py-1.5" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>선택 해제</button>
              <span className="self-center" style={{ color: "var(--dim)" }}>{selected.size} / {cubes.length}개 선택됨</span>
            </div>

            <div className="flex gap-6 flex-wrap items-center text-xs">
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--dim)" }}>QR 크기</span>
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQrSize(opt.value)}
                    className="border px-2.5 py-1 transition-colors"
                    style={{ borderColor: qrSize === opt.value ? "var(--fg)" : "var(--border)", color: qrSize === opt.value ? "var(--fg)" : "var(--dim)" }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--dim)" }}>
                <input type="checkbox" checked={showCode} onChange={(e) => setShowCode(e.target.checked)} />
                코드 텍스트 표시
              </label>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={toPrint.length === 0}
              className="self-start text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
              style={{ borderColor: "var(--fg)" }}
            >
              [[ 인쇄하기 ]]
            </button>

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

      {/* 인쇄 영역 — 화면에서는 미리보기, 인쇄 시에는 이 부분만 출력된다 */}
      <div className="print-area grid gap-8" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${qrSize + 40}px, 1fr))` }}>
        {toPrint.map((c) => (
          <div key={c.id} className="print-card flex flex-col items-center gap-2 py-4">
            <CubeQR url={c.url} code={c.code} size={qrSize} />
            {showCode && <p className="text-sm font-mono tracking-wide">{c.code}</p>}
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .print-area { gap: 24px !important; }
          .print-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
