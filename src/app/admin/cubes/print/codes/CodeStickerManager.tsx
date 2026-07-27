"use client";

import { useState } from "react";
import Link from "next/link";
import { A4_WIDTH_MM, A4_HEIGHT_MM, PAGE_MARGIN_MM, computeGrid, paginate } from "@/lib/printSheet";

/* ── 큐브 번호 스티커 시트 (A4, mm 단위) ──────────────────────────────────
   QR 스티커(/admin/cubes/print)와 완전히 분리된 별도 인쇄물 — 이 화면엔
   큐브 코드 텍스트만 배치하고 QR은 포함하지 않는다. 실제 큐브에서 QR과
   반대편 바닥면에 붙는 스티커라 부착 위치가 완전히 다르기 때문. ── */

export interface StickerCube {
  id: string;
  code: string;
}

interface Props {
  cubes: StickerCube[];
}

const SIZE_OPTIONS_MM = [
  { label: "50×25mm", w: 50, h: 25 },
  { label: "60×30mm", w: 60, h: 30 },
  { label: "70×35mm", w: 70, h: 35 },
] as const;

const GAP_MM = 6;
const CELL_PADDING_MM = 3;

export default function CodeStickerManager({ cubes }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(cubes.map((c) => c.id)));
  const [sizeIndex, setSizeIndex] = useState(0);

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
  const size = SIZE_OPTIONS_MM[sizeIndex];
  const grid = computeGrid(size.w, size.h, GAP_MM);
  const pages = paginate(toPrint, grid.perPage);

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <div className="no-print flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">큐브 번호 스티커 인쇄</h1>
          <Link href="/admin/cubes" className="text-xs" style={{ color: "var(--dim)" }}>&lt; 큐브 관리</Link>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          QR 스티커(QR이 붙는 면)는 별도 화면에서 인쇄해주세요 — <Link href="/admin/cubes/print" className="underline">QR 스티커 인쇄로 이동 →</Link>
        </p>

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
                <span style={{ color: "var(--dim)" }}>스티커 크기</span>
                {SIZE_OPTIONS_MM.map((opt, i) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSizeIndex(i)}
                    className="border px-2.5 py-1 transition-colors"
                    style={{ borderColor: sizeIndex === i ? "var(--fg)" : "var(--border)", color: sizeIndex === i ? "var(--fg)" : "var(--dim)" }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span style={{ color: "var(--dim)" }}>A4 한 장에 {grid.perPage}개 · 총 {pages.length}장</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={toPrint.length === 0}
                className="self-start text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--fg)" }}
              >
                [[ 큐브 번호 스티커 PDF 다운로드 ]]
              </button>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                인쇄 대화상자가 열리면 프린터 선택에서 &lsquo;PDF로 저장&rsquo;을 선택해주세요.
              </p>
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

      {/* 인쇄 영역 — QR 없이 코드 텍스트만, A4 페이지 단위로 출력 */}
      <div className="print-area">
        {pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="a4-page"
            style={{
              width: `${A4_WIDTH_MM}mm`,
              minHeight: `${A4_HEIGHT_MM}mm`,
              padding: `${PAGE_MARGIN_MM}mm`,
              boxSizing: "border-box",
              margin: "0 auto 12px",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${grid.cols}, ${size.w}mm)`,
                gap: `${GAP_MM}mm`,
              }}
            >
              {page.map((c) => (
                <div
                  key={c.id}
                  className="sticker-cell"
                  style={{
                    width: `${size.w}mm`,
                    height: `${size.h}mm`,
                    border: "0.3mm dashed #999",
                    padding: `${CELL_PADDING_MM}mm`,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <p style={{ fontSize: "5mm", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.04em", color: "#000", margin: 0 }}>
                    {c.code}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .a4-page { border: none !important; margin: 0 !important; page-break-after: always; }
          .a4-page:last-child { page-break-after: auto; }
          .sticker-cell { break-inside: avoid; page-break-inside: avoid; border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
