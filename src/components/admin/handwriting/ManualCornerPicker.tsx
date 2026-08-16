"use client";

/* EXPERIMENTAL ONLY — 자동 종이 경계 감지(머신비전)가 실패했을 때만 뜨는 폴백 UI.
   관리자가 사진 위에서 네 모서리를 직접 드래그해서 지정하면, 그 좌표로 서버가
   동일한 perspective warp를 수행한다 — 자동 감지를 대체하는 게 아니라 실패 시의
   안전망이다.
   드래그 중 확대경(돋보기)으로 정확한 지점을 보여주고, 48개 셀 격자를 사진 위에
   실시간으로 겹쳐 보여줘서 격자가 인쇄된 칸과 맞는지 바로 확인할 수 있게 한다
   (실제 서버 쪽 투영 변환과 동일한 결과는 아니고 시각적 가늠용 쌍선형 보간). */
import { useRef, useState } from "react";
import { CANVAS_W, CANVAS_H, cellRect, GRID_COLS, GRID_ROWS } from "@/lib/handwriting/sheetLayout";

interface Props {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  onConfirm: (corners: [number, number][]) => void;
  onCancel: () => void;
}

type PointKey = "tl" | "tr" | "bl" | "br";
type Pt = { x: number; y: number };

const LABELS: Record<PointKey, string> = {
  tl: "좌상단",
  tr: "우상단",
  bl: "좌하단",
  br: "우하단",
};

const INSET = 0.1; // 초기 위치: 이미지 가장자리에서 10% 안쪽
const LOUPE_SIZE = 120; // px
const LOUPE_ZOOM = 3;

function bilerp(tl: Pt, tr: Pt, bl: Pt, br: Pt, u: number, v: number): Pt {
  const top = { x: tl.x + (tr.x - tl.x) * u, y: tl.y + (tr.y - tl.y) * u };
  const bottom = { x: bl.x + (br.x - bl.x) * u, y: bl.y + (br.y - bl.y) * u };
  return { x: top.x + (bottom.x - top.x) * v, y: top.y + (bottom.y - top.y) * v };
}

export default function ManualCornerPicker({ imageDataUrl, imageWidth, imageHeight, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 화면 표시 좌표(0~1, 이미지 크기에 대한 비율)로 관리 — 실제 픽셀 변환은 확인 시점에만.
  const [points, setPoints] = useState<Record<PointKey, Pt>>({
    tl: { x: INSET, y: INSET },
    tr: { x: 1 - INSET, y: INSET },
    bl: { x: INSET, y: 1 - INSET },
    br: { x: 1 - INSET, y: 1 - INSET },
  });
  const draggingRef = useRef<PointKey | null>(null);
  const [loupe, setLoupe] = useState<{ key: PointKey; x: number; y: number } | null>(null);
  // containerRef.current.getBoundingClientRect()를 렌더 중에 직접 읽으면 안 되므로(React
  // refs는 렌더링에 쓰지 말 것 — react-hooks/refs 규칙), 드래그 중 측정한 컨테이너 크기를
  // state로 들고 있다가 확대경 위치 계산(렌더 시점)에는 이 state만 사용한다.
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  function handleResetPoints() {
    setPoints({
      tl: { x: INSET, y: INSET },
      tr: { x: 1 - INSET, y: INSET },
      bl: { x: INSET, y: 1 - INSET },
      br: { x: 1 - INSET, y: 1 - INSET },
    });
  }

  function updateFromClientPos(key: PointKey, clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContainerSize({ width: rect.width, height: rect.height });
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setPoints((prev) => ({ ...prev, [key]: { x, y } }));
    setLoupe({ key, x, y });
  }

  function handlePointerDown(key: PointKey, e: React.PointerEvent) {
    e.preventDefault();
    draggingRef.current = key;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientPos(key, e.clientX, e.clientY);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const key = draggingRef.current;
    if (!key) return;
    updateFromClientPos(key, e.clientX, e.clientY);
  }

  function handlePointerUp() {
    draggingRef.current = null;
    setLoupe(null);
  }

  function handleConfirm() {
    // 표시 비율 좌표 -> 원본 이미지 픽셀 좌표로 변환
    const order: PointKey[] = ["tl", "tr", "br", "bl"];
    const corners: [number, number][] = order.map((k) => [
      points[k].x * imageWidth,
      points[k].y * imageHeight,
    ]);
    onConfirm(corners);
  }

  // 48개 셀 테두리를 현재 드래그 중인 네 모서리로 쌍선형 보간해 미리보기 격자를 만든다.
  const cellPolygons = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => {
    const { x0, y0, x1, y1 } = cellRect(i);
    const corners: [number, number][] = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
    return corners.map(([px, py]) => {
      const u = px / CANVAS_W;
      const v = py / CANVAS_H;
      return bilerp(points.tl, points.tr, points.bl, points.br, u, v);
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.92)" }}>
      <div className="p-4 space-y-1 flex-shrink-0">
        <p className="text-sm font-medium text-white">종이의 네 모서리를 직접 맞춰주세요</p>
        <p className="text-xs" style={{ color: "#999" }}>
          각 점을 드래그해서 종이의 실제 모서리에 맞춰주세요. 격자선이 인쇄된 칸 테두리와 겹치면 정확한 겁니다.
        </p>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div
          ref={containerRef}
          className="relative touch-none select-none"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="촬영한 원본 사진"
            className="block max-w-full max-h-full"
            style={{ maxHeight: "70vh" }}
            draggable={false}
          />
          {/* 네 변 + 48칸 격자 미리보기(참고용, 실제 서버 계산과 완전히 동일하진 않음) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <polygon
              points={(["tl", "tr", "br", "bl"] as PointKey[])
                .map((k) => `${points[k].x * 100}%,${points[k].y * 100}%`)
                .join(" ")}
              fill="rgba(255,255,255,0.06)"
              stroke="#7dd3fc"
              strokeWidth={2}
            />
            {cellPolygons.map((poly, i) => (
              <polygon
                key={i}
                points={poly.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ")}
                fill="none"
                stroke="rgba(125,211,252,0.55)"
                strokeWidth={1}
              />
            ))}
          </svg>
          {(Object.keys(points) as PointKey[]).map((key) => (
            <div
              key={key}
              onPointerDown={(e) => handlePointerDown(key, e)}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                left: `${points[key].x * 100}%`,
                top: `${points[key].y * 100}%`,
                width: 36,
                height: 36,
                marginLeft: -18,
                marginTop: -18,
                background: "#7dd3fc",
                border: "3px solid #0c2733",
                cursor: "grab",
                touchAction: "none",
              }}
            >
              <span className="text-[10px] font-semibold" style={{ color: "#0c2733" }}>
                {LABELS[key]}
              </span>
            </div>
          ))}

          {/* 드래그 중 확대경 — 손가락에 가려지지 않게 터치 지점 위쪽에 띄운다 */}
          {loupe && (
            <div
              className="absolute rounded-full pointer-events-none overflow-hidden"
              style={{
                left: `${loupe.x * 100}%`,
                top: `${loupe.y * 100}%`,
                width: LOUPE_SIZE,
                height: LOUPE_SIZE,
                marginLeft: -LOUPE_SIZE / 2,
                marginTop: -LOUPE_SIZE - 40,
                border: "3px solid #7dd3fc",
                boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                backgroundImage: `url(${imageDataUrl})`,
                backgroundSize: `${containerSize.width * LOUPE_ZOOM}px ${containerSize.height * LOUPE_ZOOM}px`,
                backgroundPosition: `${LOUPE_SIZE / 2 - loupe.x * containerSize.width * LOUPE_ZOOM}px ${LOUPE_SIZE / 2 - loupe.y * containerSize.height * LOUPE_ZOOM}px`,
              }}
            >
              {/* 십자선 — 정확히 이 지점에 점이 찍힌다 */}
              <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: "rgba(125,211,252,0.9)" }} />
              <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "rgba(125,211,252,0.9)" }} />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 flex gap-2 flex-shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] text-sm py-2.5 border"
          style={{ borderColor: "#444", color: "#ccc" }}
        >
          다시 촬영하기
        </button>
        <button
          type="button"
          onClick={handleResetPoints}
          className="flex-1 min-h-[44px] text-sm py-2.5 border"
          style={{ borderColor: "#444", color: "#ccc" }}
        >
          다시 맞추기
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-[1.4] min-h-[44px] text-sm py-2.5 border font-medium"
          style={{ borderColor: "#7dd3fc", color: "#7dd3fc" }}
        >
          이 위치로 사용
        </button>
      </div>
    </div>
  );
}
