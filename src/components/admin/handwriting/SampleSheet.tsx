"use client";

/* EXPERIMENTAL ONLY — 인쇄용 손글씨 샘플 시트.
   좌표는 전부 CANVAS_W/CANVAS_H(=sheetLayout.ts, handwriting-service와 동일 값) 기준
   퍼센트로 환산해 배치한다 — 실제 인쇄 해상도/프린터와 무관하게 A4 비율(1200:1697≈210:297mm)
   컨테이너 안에서 항상 같은 상대 위치를 유지해, 촬영 후 코너 마커 인식만 되면 셀 좌표가 맞는다. */

import { referenceChars } from "@/lib/handwriting/referenceChars";
import { CANVAS_W, CANVAS_H, MARKERS, MARKER_SIZE, cellRect, GRID_COLS } from "@/lib/handwriting/sheetLayout";

function pctX(px: number) {
  return `${(px / CANVAS_W) * 100}%`;
}
function pctY(px: number) {
  return `${(px / CANVAS_H) * 100}%`;
}

export default function SampleSheet() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm px-4 py-2 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          작성용 양식 인쇄
        </button>
      </div>

      <div
        className="relative mx-auto bg-white border print:border-0"
        style={{
          width: "210mm",
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          maxWidth: "100%",
        }}
        id="handwriting-sample-sheet"
      >
        {/* 코너 마커 — 촬영 사진에서 검은 사각형으로 인식되어 perspective correction 기준점이 된다 */}
        {(Object.entries(MARKERS) as [keyof typeof MARKERS, readonly [number, number]][]).map(([key, [cx, cy]]) => (
          <div
            key={key}
            className="absolute bg-black"
            style={{
              left: pctX(cx - MARKER_SIZE / 2),
              top: pctY(cy - MARKER_SIZE / 2),
              width: pctX(MARKER_SIZE),
              height: pctY(MARKER_SIZE),
            }}
          />
        ))}

        {/* 헤더 */}
        <div
          className="absolute text-center"
          style={{ left: pctX(100), top: pctY(140), width: pctX(1000) }}
        >
          <p className="text-sm font-bold text-black">공간큐브 — 손글씨 샘플 시트 (실험용)</p>
          <p className="text-xs text-black mt-1">
            각 칸 안의 회색 글자를 검은 펜으로 최대한 또박또박 따라 써주세요. 네 모서리의 검은 사각형이 잘리지 않게 촬영해주세요.
          </p>
        </div>

        {/* 4x12 글자 그리드 */}
        {referenceChars.map((ch, i) => {
          const { x0, y0, x1, y1 } = cellRect(i);
          return (
            <div
              key={i}
              className="absolute border border-gray-400 flex items-center justify-center"
              style={{ left: pctX(x0), top: pctY(y0), width: pctX(x1 - x0), height: pctY(y1 - y0) }}
            >
              <span className="text-gray-300 select-none" style={{ fontSize: "clamp(14px, 4vw, 32px)" }}>
                {ch}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs print:hidden" style={{ color: "var(--dim)" }}>
        총 {referenceChars.length}자, {GRID_COLS}열 그리드. A4 용지에 실제 크기(100%)로 인쇄해주세요(맞춤/축소 인쇄 끄기).
      </p>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          #handwriting-sample-sheet, #handwriting-sample-sheet * { visibility: visible; }
          #handwriting-sample-sheet { position: fixed; left: 0; top: 0; width: 210mm; height: 297mm; }
        }
      `}</style>
    </div>
  );
}
