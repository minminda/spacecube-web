"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import { WORLD_W, WORLD_H } from "@/app/space/[slug]/guestbook/dummyNotes";

/* ── 운영자용 질문 군집 위치 배치 ──────────────────────────────────
   방문자용 무한 캔버스(GuestbookCanvas)와 동일한 좌표계(WORLD_W/H=5000)와
   팬줌 라이브러리(react-zoom-pan-pinch)를 재사용하되, 방문자 작성/보상 로직과는
   결합하지 않고 "군집 3개를 드래그로 옮기고 저장" 하나만 하는 전용 컴포넌트다.
──────────────────────────────────────────────────────────────── */

const MARKER_W = 160;

interface ClusterPositions {
  freeClusterX: number;
  freeClusterY: number;
  question1ClusterX: number;
  question1ClusterY: number;
  question2ClusterX: number;
  question2ClusterY: number;
}

interface Props {
  spaceId: string;
  question1: string | null;
  question2: string | null;
  initial: ClusterPositions;
}

const DEFAULTS: ClusterPositions = {
  freeClusterX: 2500,
  freeClusterY: 2500,
  question1ClusterX: 2000,
  question1ClusterY: 2200,
  question2ClusterX: 3000,
  question2ClusterY: 2800,
};

type MarkerKey = "free" | "q1" | "q2";

export default function GuestbookClusterPlacer({ spaceId, question1, question2, initial }: Props) {
  const router = useRouter();
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<MarkerKey | null>(null);

  const [positions, setPositions] = useState<ClusterPositions>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const worldPointFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = worldRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const scale = rect.width / WORLD_W;
    const wx = (clientX - rect.left) / scale;
    const wy = (clientY - rect.top) / scale;
    return { x: Math.min(Math.max(wx, 0), WORLD_W), y: Math.min(Math.max(wy, 0), WORLD_H) };
  }, []);

  // stop이 자기 자신을 참조하며 리스너를 떼어내야 해서(addEventListener와 동일한 함수 참조로
  // removeEventListener 해야 함) useState의 lazy initializer로 딱 한 번만 만들어 재사용한다 —
  // 렌더 중 ref.current를 읽고 쓰는 대신, React가 공식적으로 권장하는 "한 번만 생성" 패턴이다.
  const [handlers] = useState(() => {
    const move = (e: PointerEvent) => {
      const key = draggingRef.current;
      if (!key) return;
      const point = worldPointFromEvent(e.clientX, e.clientY);
      if (!point) return;
      setPositions((prev) => {
        if (key === "free") return { ...prev, freeClusterX: point.x, freeClusterY: point.y };
        if (key === "q1") return { ...prev, question1ClusterX: point.x, question1ClusterY: point.y };
        return { ...prev, question2ClusterX: point.x, question2ClusterY: point.y };
      });
    };
    const stop = () => {
      draggingRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    return { move, stop };
  });

  function startDragging(key: MarkerKey, e: React.PointerEvent) {
    e.stopPropagation();
    draggingRef.current = key;
    window.addEventListener("pointermove", handlers.move);
    window.addEventListener("pointerup", handlers.stop);
  }

  function resetPositions() {
    setPositions(DEFAULTS);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/operator/spaces/${spaceId}/guestbook/draft/clusters`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(positions),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  const markers: { key: MarkerKey; label: string; x: number; y: number }[] = [
    { key: "free", label: "자유롭게 남겨주세요", x: positions.freeClusterX, y: positions.freeClusterY },
  ];
  if (question1) markers.push({ key: "q1", label: question1, x: positions.question1ClusterX, y: positions.question1ClusterY });
  if (question2) markers.push({ key: "q2", label: question2, x: positions.question2ClusterX, y: positions.question2ClusterY });

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 3.5rem)", background: "#000" }}>
      <div className="flex items-center justify-between px-6 py-4 gap-3">
        <p className="text-xs" style={{ color: "#888" }}>군집을 드래그해서 위치를 정해주세요.</p>
      </div>

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
              {markers.map((m) => (
                <div
                  key={m.key}
                  className="cluster-marker absolute p-3 select-none cursor-grab active:cursor-grabbing"
                  style={{
                    left: m.x - MARKER_W / 2,
                    top: m.y - 40,
                    width: MARKER_W,
                    background: "rgba(255,255,255,0.1)",
                    border: "1.5px dashed rgba(255,255,255,0.6)",
                    borderRadius: 4,
                  }}
                  onPointerDown={(e) => startDragging(m.key, e)}
                >
                  <p className="text-[11px] leading-relaxed break-keep text-center" style={{ color: "#eee" }}>{m.label}</p>
                </div>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      <div className="flex flex-col gap-2.5 px-6 py-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => transformRef.current?.zoomOut(0.35)} className="w-8 h-8 border text-sm" style={{ borderColor: "#333", color: "#999" }}>−</button>
          <button type="button" onClick={() => transformRef.current?.zoomIn(0.35)} className="w-8 h-8 border text-sm" style={{ borderColor: "#333", color: "#999" }}>+</button>
          <button type="button" onClick={() => transformRef.current?.resetTransform(400)} className="h-8 px-2.5 border text-xs ml-1" style={{ borderColor: "#333", color: "#999" }}>초기 위치</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={resetPositions} className="flex-1 text-xs py-2.5 px-3 border" style={{ borderColor: "#555", color: "#ccc" }}>배치 초기화</button>
          <button type="button" onClick={() => router.push("/operator")} className="flex-1 text-xs py-2.5 px-3 border" style={{ borderColor: "#555", color: "#ccc" }}>취소</button>
          <button type="button" onClick={save} disabled={saving} className="flex-1 text-xs py-2.5 px-3 border disabled:opacity-40" style={{ borderColor: "#fff", color: "#fff" }}>
            {saving ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
