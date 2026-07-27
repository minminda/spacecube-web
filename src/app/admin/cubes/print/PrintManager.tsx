"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CubeQR from "@/components/CubeQR";
import QrStickerPrintSheet from "./QrStickerPrintSheet";
import GcCodeStickerPrintSheet from "./GcCodeStickerPrintSheet";

export interface PrintCube {
  id: string;
  code: string;
  url: string;
}

interface Props {
  cubes: PrintCube[];
}

const PREVIEW_QR_SIZE = 96;

export default function PrintManager({ cubes }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(cubes.map((c) => c.id)));
  const [printTarget, setPrintTarget] = useState<"qr" | "gc" | null>(null);

  useEffect(() => {
    if (!printTarget) return;
    function handleAfterPrint() {
      setPrintTarget(null);
    }
    window.addEventListener("afterprint", handleAfterPrint);
    window.print();
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [printTarget]);

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
    <>
    <div className="min-h-screen px-6 py-8 no-print" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">QR / GC 코드 스티커 인쇄</h1>
          <Link href="/admin/cubes" className="text-xs" style={{ color: "var(--dim)" }}>&lt; 큐브 관리</Link>
        </div>

        {cubes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>인쇄할 큐브가 없어요.</p>
        ) : (
          <>
            <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
              QR 스티커 — 재단 45×45mm / 작업 49×49mm, A4 3열×3행(9개) 자동 분할, QR과 중앙 로고만 포함.<br />
              GC 코드 스티커 — 재단 20×10mm, A4에 최대한 효율적으로 배치, 코드 텍스트만 포함.<br />
              두 인쇄물 모두 도무송 칼선(재단사이즈 기준)을 함께 출력하며, QR은 SVG 벡터라 확대해도 깨지지 않습니다.
              인쇄 대화상자에서 프린터로 바로 출력하거나 &quot;PDF로 저장&quot;을 선택할 수 있어요(배율은 100%로 두세요).
            </p>

            <div className="flex gap-3 flex-wrap text-xs">
              <button type="button" onClick={selectAll} className="border px-3 py-1.5" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>전체 선택</button>
              <button type="button" onClick={selectNone} className="border px-3 py-1.5" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>선택 해제</button>
              <span className="self-center" style={{ color: "var(--dim)" }}>{selected.size} / {cubes.length}개 선택됨</span>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setPrintTarget("qr")}
                disabled={toPrint.length === 0 || printTarget !== null}
                className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--fg)" }}
              >
                {printTarget === "qr" ? "인쇄 준비 중..." : "[[ QR 인쇄하기 ]]"}
              </button>
              <button
                type="button"
                onClick={() => setPrintTarget("gc")}
                disabled={toPrint.length === 0 || printTarget !== null}
                className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {printTarget === "gc" ? "인쇄 준비 중..." : "[[ GC 코드 인쇄하기 ]]"}
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

      {/* 미리보기 — QR 스티커와 동일하게 QR+중앙 로고만 보여준다(화면 표시용, CubeQR 캔버스).
          실제 인쇄되는 내용은 아래 .print-sheet-root(SVG 벡터)이며 화면에는 보이지 않는다. */}
      <div className="grid gap-8 no-print" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${PREVIEW_QR_SIZE + 40}px, 1fr))` }}>
        {toPrint.map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-2 py-4">
            <CubeQR url={c.url} code={c.code} size={PREVIEW_QR_SIZE} />
          </div>
        ))}
      </div>
    </div>

    {/* 실제 인쇄 대상 — .no-print 밖의 별도 최상위 요소. 화면에는 항상 숨겨져 있고,
        window.print() 호출 시(@media print)에만 표시된다. .no-print 안에 두면 그
        부모가 통째로 숨겨질 때 같이 사라져 인쇄 내용이 아예 안 나오므로 반드시 형제로 둔다. */}
    <div className="print-sheet-root">
      <div style={{ display: printTarget === "qr" ? "block" : "none" }}>
        <QrStickerPrintSheet cubes={toPrint.map((c) => ({ code: c.code, url: c.url }))} />
      </div>
      <div style={{ display: printTarget === "gc" ? "block" : "none" }}>
        <GcCodeStickerPrintSheet codes={toPrint.map((c) => c.code)} />
      </div>
    </div>

    <style>{`
      .print-sheet-root { display: none; }
      @media print {
        @page { size: A4; margin: 0; }
        .no-print { display: none !important; }
        .print-sheet-root { display: block; }
        html, body { margin: 0; padding: 0; }
      }
    `}</style>
    </>
  );
}
