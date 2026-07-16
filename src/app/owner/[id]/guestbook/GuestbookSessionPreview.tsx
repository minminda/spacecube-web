"use client";

import { useCallback, useRef, useState } from "react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import { WORLD_W, WORLD_H } from "@/app/space/[slug]/guestbook/canvasConstants";
import GuestbookClusterLabel from "@/components/GuestbookClusterLabel";

/* ── 관리자 방명록 배치 미리보기 ──────────────────────────────────────
   방문자 무한 캔버스와 동일한 좌표계(WORLD_W/H=5000)·팬줌 라이브러리(react-zoom-pan-pinch)를
   재사용하고, 라벨 렌더도 GuestbookClusterLabel(방문자 캔버스와 완전히 동일한 컴포넌트)을
   그대로 써서 "실제 방문자 화면과 유사하게" 미리 볼 수 있게 한다. 숨김 처리된 군집도
   드래그로 위치를 미리 잡아둘 수 있도록 항상 표시하되, 흐리게 처리해 구분한다. ──────── */

export type PreviewClusterKey = "free" | "q1" | "q2";

export interface PreviewCluster {
  key: PreviewClusterKey;
  type: "FREE" | "QUESTION_1" | "QUESTION_2";
  label: string;
  fontSize: number;
  color: string;
  visible: boolean;
  x: number;
  y: number;
}

interface Props {
  clusters: PreviewCluster[];
  onDragCluster: (key: PreviewClusterKey, x: number, y: number) => void;
}

export default function GuestbookSessionPreview({ clusters, onDragCluster }: Props) {
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<PreviewClusterKey | null>(null);

  const worldPointFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = worldRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const scale = rect.width / WORLD_W;
    const wx = (clientX - rect.left) / scale;
    const wy = (clientY - rect.top) / scale;
    return { x: Math.min(Math.max(wx, 0), WORLD_W), y: Math.min(Math.max(wy, 0), WORLD_H) };
  }, []);

  // 리스너를 자기 자신과 같은 참조로 떼어내야 해서(addEventListener/removeEventListener)
  // 렌더마다 새로 만들지 않고 최초 1회만 생성한다.
  const [handlers] = useState(() => {
    const move = (e: PointerEvent) => {
      const key = draggingRef.current;
      if (!key) return;
      const point = worldPointFromEvent(e.clientX, e.clientY);
      if (!point) return;
      onDragCluster(key, point.x, point.y);
    };
    const stop = () => {
      draggingRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    return { move, stop };
  });

  function startDragging(key: PreviewClusterKey, e: React.PointerEvent) {
    e.stopPropagation();
    draggingRef.current = key;
    window.addEventListener("pointermove", handlers.move);
    window.addEventListener("pointerup", handlers.stop);
  }

  return (
    <div className="flex flex-col" style={{ height: "60vh", minHeight: 360, background: "#000" }}>
      <div className="relative flex-1 overflow-hidden" style={{ touchAction: "none" }}>
        <TransformWrapper
          ref={transformRef}
          initialScale={0.14}
          minScale={0.06}
          maxScale={1.2}
          wheel={{ step: 0.12 }}
          pinch={{ step: 6 }}
          doubleClick={{ disabled: true }}
          panning={{ excluded: ["cluster-marker"] }}
        >
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: WORLD_W, height: WORLD_H }}>
            <div ref={worldRef} className="relative" style={{ width: WORLD_W, height: WORLD_H, background: "#000" }}>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
                  backgroundSize: "64px 64px",
                }}
              />
              {clusters.map((c) => (
                <div
                  key={c.key}
                  className="cluster-marker absolute select-none cursor-grab active:cursor-grabbing"
                  style={{
                    left: c.x,
                    top: c.y,
                    transform: "translate(-50%, -50%)",
                    opacity: c.visible ? 1 : 0.35,
                    outline: c.visible ? "none" : "1.5px dashed rgba(255,255,255,0.5)",
                  }}
                  onPointerDown={(e) => startDragging(c.key, e)}
                >
                  <GuestbookClusterLabel cluster={c} />
                  {!c.visible && (
                    <p className="text-center text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>숨김</p>
                  )}
                </div>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      <div className="flex items-center gap-1.5 px-1 pt-2">
        <button type="button" onClick={() => transformRef.current?.zoomOut(0.35)} className="w-8 h-8 border text-sm" style={{ borderColor: "#333", color: "#999" }}>−</button>
        <button type="button" onClick={() => transformRef.current?.zoomIn(0.35)} className="w-8 h-8 border text-sm" style={{ borderColor: "#333", color: "#999" }}>+</button>
        <button type="button" onClick={() => transformRef.current?.resetTransform(400)} className="h-8 px-2.5 border text-xs ml-1" style={{ borderColor: "#333", color: "#999" }}>초기 위치</button>
        <p className="text-[10px] ml-auto" style={{ color: "#666" }}>드래그해서 위치를 옮기세요</p>
      </div>
    </div>
  );
}
