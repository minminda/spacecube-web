"use client";

/* EXPERIMENTAL ONLY — 자동 종이 경계 감지(머신비전)가 실패했을 때만 뜨는 폴백 UI.
   관리자가 사진 위에서 네 모서리를 직접 드래그해서 지정하면, 그 좌표로 서버가
   동일한 perspective warp를 수행한다 — 자동 감지를 대체하는 게 아니라 실패 시의
   안전망이다. */
import { useRef, useState } from "react";

interface Props {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  onConfirm: (corners: [number, number][]) => void;
  onCancel: () => void;
}

type PointKey = "tl" | "tr" | "bl" | "br";

const LABELS: Record<PointKey, string> = {
  tl: "좌상단",
  tr: "우상단",
  bl: "좌하단",
  br: "우하단",
};

const INSET = 0.1; // 초기 위치: 이미지 가장자리에서 10% 안쪽

export default function ManualCornerPicker({ imageDataUrl, imageWidth, imageHeight, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 화면 표시 좌표(0~1, 이미지 크기에 대한 비율)로 관리 — 실제 픽셀 변환은 확인 시점에만.
  const [points, setPoints] = useState<Record<PointKey, { x: number; y: number }>>({
    tl: { x: INSET, y: INSET },
    tr: { x: 1 - INSET, y: INSET },
    bl: { x: INSET, y: 1 - INSET },
    br: { x: 1 - INSET, y: 1 - INSET },
  });
  const draggingRef = useRef<PointKey | null>(null);

  function updateFromClientPos(key: PointKey, clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setPoints((prev) => ({ ...prev, [key]: { x, y } }));
  }

  function handlePointerDown(key: PointKey, e: React.PointerEvent) {
    e.preventDefault();
    draggingRef.current = key;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const key = draggingRef.current;
    if (!key) return;
    updateFromClientPos(key, e.clientX, e.clientY);
  }

  function handlePointerUp() {
    draggingRef.current = null;
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.92)" }}>
      <div className="p-4 space-y-1 flex-shrink-0">
        <p className="text-sm font-medium text-white">종이의 네 모서리를 직접 맞춰주세요</p>
        <p className="text-xs" style={{ color: "#999" }}>
          자동 인식이 안 돼서, 각 점을 드래그해서 종이의 실제 모서리에 맞춰주시면 됩니다.
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
          {/* 네 변을 잇는 안내선 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <polygon
              points={(["tl", "tr", "br", "bl"] as PointKey[])
                .map((k) => `${points[k].x * 100}%,${points[k].y * 100}%`)
                .join(" ")}
              fill="rgba(255,255,255,0.12)"
              stroke="#7dd3fc"
              strokeWidth={2}
            />
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
        </div>
      </div>

      <div className="p-4 flex gap-2 flex-shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] text-sm py-2.5 border"
          style={{ borderColor: "#444", color: "#ccc" }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 min-h-[44px] text-sm py-2.5 border font-medium"
          style={{ borderColor: "#7dd3fc", color: "#7dd3fc" }}
        >
          이 위치로 확인
        </button>
      </div>
    </div>
  );
}
