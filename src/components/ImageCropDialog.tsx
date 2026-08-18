"use client";

import { useEffect, useRef, useState } from "react";
import {
  type PixelRect,
  type Corner,
  clampRect,
  moveRect,
  resizeRectFromCorner,
  centeredRect,
  scaleRectToNatural,
  loadImage,
  cropImageToFile,
} from "@/lib/imageCrop";

/* ── 공용 이미지 자르기 다이얼로그 ────────────────────────────────────
   파일 선택 직후(업로드 전) 로컬 미리보기 위에서 실제로 잘라낼 영역을 관리자가
   직접 정한다 — 사진을 뒤에서 드래그/확대하는 방식이 아니라 crop box 자체를
   이동·리사이즈한다. "자르기"를 누르면 naturalWidth/Height 기준 원본 해상도로
   실제 File을 만들고, 결과 미리보기(다시 자르기/확정) 단계를 거친 뒤에만
   호출부로 넘긴다 — 업로드는 이 컴포넌트의 책임이 아니다(호출부가 기존
   업로드 파이프라인에 결과 File을 그대로 넘긴다). ──────────────────── */

export interface AspectOption {
  label: string;
  value: number | null; // null = 자유(비율 고정 없음)
}

interface Props {
  file: File;
  /** 여러 비율 중 고를 수 있게 하려면(Episode Scene: 자유/3:2/16:9) */
  aspectOptions?: AspectOption[];
  /** aspectOptions 없이 비율 하나로 고정하려면(Space 대표사진: 기존 Hero 비율) */
  fixedAspect?: number;
  /** width/height는 실제로 잘린 결과의 원본 픽셀 크기 — 호출부가 이미지를 다시 로드하지
   *  않고도 바로 저장할 수 있도록 함께 넘긴다(방문자 화면의 레이아웃 계산에 쓰임). */
  onConfirm: (croppedFile: File, width: number, height: number) => void;
  onCancel: () => void;
}

type DragTarget = "move" | Corner;

const CORNER_STYLE: Record<Corner, React.CSSProperties> = {
  nw: { left: 0, top: 0, transform: "translate(-50%, -50%)", cursor: "nwse-resize" },
  ne: { left: "100%", top: 0, transform: "translate(-50%, -50%)", cursor: "nesw-resize" },
  sw: { left: 0, top: "100%", transform: "translate(-50%, -50%)", cursor: "nesw-resize" },
  se: { left: "100%", top: "100%", transform: "translate(-50%, -50%)", cursor: "nwse-resize" },
};

export default function ImageCropDialog({ file, aspectOptions, fixedAspect, onConfirm, onCancel }: Props) {
  const [objectUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  const [aspect, setAspect] = useState<number | null>(
    aspectOptions ? aspectOptions[0].value : fixedAspect ?? null,
  );
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<PixelRect | null>(null);
  const [stage, setStage] = useState<"edit" | "preview">("edit");
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [croppedDims, setCroppedDims] = useState<{ w: number; h: number } | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ type: DragTarget; startX: number; startY: number; startBox: PixelRect } | null>(null);

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setDisplaySize({ w: rect.width, h: rect.height });
    setBox(centeredRect(rect.width, rect.height, aspect));
  }

  function changeAspect(next: number | null) {
    setAspect(next);
    if (displaySize) setBox(centeredRect(displaySize.w, displaySize.h, next));
  }

  function startDrag(type: DragTarget, e: React.PointerEvent) {
    if (!box) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { type, startX: e.clientX, startY: e.clientY, startBox: box };
    e.stopPropagation();
  }

  function onDragMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !displaySize) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.type === "move") {
      setBox(moveRect(drag.startBox, dx, dy, displaySize.w, displaySize.h));
    } else {
      setBox(resizeRectFromCorner(drag.startBox, drag.type, dx, dy, aspect, displaySize.w, displaySize.h));
    }
  }

  function endDrag() {
    dragRef.current = null;
  }

  async function handleCrop() {
    if (!box || !displaySize || !naturalSize) return;
    setProcessing(true);
    setError("");
    try {
      const img = await loadImage(objectUrl);
      const naturalRect = scaleRectToNatural(
        clampRect(box, displaySize.w, displaySize.h),
        displaySize.w, displaySize.h,
        naturalSize.w, naturalSize.h,
      );
      const result = await cropImageToFile(img, naturalRect, file.name.replace(/\.\w+$/, "") + "-cropped.jpg");
      setCroppedFile(result);
      setCroppedDims({ w: Math.max(1, Math.round(naturalRect.width)), h: Math.max(1, Math.round(naturalRect.height)) });
      setCroppedPreviewUrl(URL.createObjectURL(result));
      setStage("preview");
    } catch {
      setError("이미지를 잘라내지 못했어요. 다시 시도해주세요.");
    } finally {
      setProcessing(false);
    }
  }

  function retryEdit() {
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    setCroppedPreviewUrl(null);
    setCroppedFile(null);
    setCroppedDims(null);
    setStage("edit");
  }

  function confirmFinal() {
    if (croppedFile && croppedDims) onConfirm(croppedFile, croppedDims.w, croppedDims.h);
  }

  const btnBase = "flex-1 min-h-[44px] text-sm py-2.5 px-3 border transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.94)" }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button type="button" onClick={onCancel} className="text-xs px-2 py-1" style={{ color: "#ccc" }}>취소</button>
        <p className="text-xs" style={{ color: "#999" }}>{stage === "edit" ? "잘라낼 영역을 선택하세요" : "미리보기"}</p>
        <div style={{ width: 40 }} />
      </div>

      {stage === "edit" ? (
        <>
          <div className="flex-1 flex items-center justify-center px-4 min-h-0">
            <div className="relative touch-none select-none" onPointerMove={onDragMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={objectUrl}
                onLoad={handleImageLoad}
                alt=""
                draggable={false}
                className="block select-none"
                style={{ maxWidth: "80vw", maxHeight: "55vh", width: "auto", height: "auto" }}
              />
              {box && displaySize && (
                <>
                  {/* crop box 바깥을 어둡게 — 잘려나갈 영역을 한눈에 보여준다 */}
                  <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: displaySize.w, height: box.y, background: "rgba(0,0,0,0.6)" }} />
                  <div className="absolute pointer-events-none" style={{ left: 0, top: box.y + box.height, width: displaySize.w, height: displaySize.h - box.y - box.height, background: "rgba(0,0,0,0.6)" }} />
                  <div className="absolute pointer-events-none" style={{ left: 0, top: box.y, width: box.x, height: box.height, background: "rgba(0,0,0,0.6)" }} />
                  <div className="absolute pointer-events-none" style={{ left: box.x + box.width, top: box.y, width: displaySize.w - box.x - box.width, height: box.height, background: "rgba(0,0,0,0.6)" }} />

                  <div
                    className="absolute border-2 cursor-move"
                    style={{ left: box.x, top: box.y, width: box.width, height: box.height, borderColor: "#fff", touchAction: "none" }}
                    onPointerDown={(e) => startDrag("move", e)}
                  >
                    {(Object.keys(CORNER_STYLE) as Corner[]).map((corner) => (
                      <div
                        key={corner}
                        onPointerDown={(e) => startDrag(corner, e)}
                        className="absolute w-8 h-8 flex items-center justify-center"
                        style={{ ...CORNER_STYLE[corner], touchAction: "none" }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: "#fff" }} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {aspectOptions && (
            <div className="flex gap-2 justify-center px-4 py-3 flex-shrink-0">
              {aspectOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => changeAspect(opt.value)}
                  className="text-xs px-3 py-1.5 border transition-colors"
                  style={{
                    borderColor: aspect === opt.value ? "#fff" : "#555",
                    background: aspect === opt.value ? "#fff" : "transparent",
                    color: aspect === opt.value ? "#000" : "#ccc",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-center px-4" style={{ color: "#f66" }}>{error}</p>}

          <div className="px-4 flex-shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)", paddingTop: "0.5rem" }}>
            <button
              type="button"
              onClick={handleCrop}
              disabled={!box || processing}
              className="tap-target w-full text-sm font-medium py-3 px-3 disabled:opacity-40"
              style={{ background: "#fff", color: "#000" }}
            >
              {processing ? "자르는 중..." : "자르기"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 flex items-center justify-center px-4 min-h-0">
            {croppedPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={croppedPreviewUrl} alt="잘라낸 결과" className="block" style={{ maxWidth: "85vw", maxHeight: "60vh", width: "auto", height: "auto" }} />
            )}
          </div>
          <div className="px-4 flex gap-3 flex-shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)", paddingTop: "0.5rem" }}>
            <button type="button" onClick={retryEdit} className={btnBase} style={{ borderColor: "#555", color: "#ccc" }}>
              다시 자르기
            </button>
            <button type="button" onClick={confirmFinal} className={btnBase} style={{ borderColor: "#fff", color: "#000", background: "#fff" }}>
              확정
            </button>
          </div>
        </>
      )}
    </div>
  );
}
