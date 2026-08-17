"use client";

import { useRef, useState } from "react";

/**
 * 이미지 업로드 + 확대/축소 + 드래그 위치 조절 에디터.
 * 원본 파일을 실제로 자르지 않고 zoom/positionX/positionY(0~1 focal point)만 저장한다.
 * 렌더링은 object-fit: cover + object-position + transform: scale 조합으로 재현한다.
 */

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(file: File): Promise<string | null> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  try {
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
    const result = await res.json();
    return result.secure_url ?? null;
  } catch {
    return null;
  }
}

export interface ImageTransform {
  imageUrl: string;
  zoom: number;
  positionX: number;
  positionY: number;
}

interface Props {
  value: ImageTransform;
  onChange: (value: ImageTransform) => void;
  aspectRatio: string; // CSS aspect-ratio 값, 예: "4/3", "3/2", "16/9"
  minZoom?: number;
  maxZoom?: number;
  label?: string;
  /** "cover"(기본, 기존 동작과 완전히 동일 — 직접 Crop) | "contain"(원본 비율 그대로 — 고정 프레임 없이
   *  이미지 자체 크기만큼만 영역을 차지, 드래그/확대가 의미 없으므로 그 컨트롤을 숨기고 정적 미리보기만
   *  보여준다). 생략하면 기존 호출부(공간 대표사진 등)는 전혀 영향받지 않는다. */
  fit?: "cover" | "contain";
}

export default function ImagePositionEditor({
  value,
  onChange,
  aspectRatio,
  minZoom = 1,
  maxZoom = 3,
  label = "이미지",
  fit = "cover",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    onChange({ ...value, imageUrl: localUrl });
    setUploadError("");
    setUploading(true);
    const url = await uploadToCloudinary(file);
    setUploading(false);
    if (url) {
      onChange({ imageUrl: url, zoom: 1, positionX: 0.5, positionY: 0.5 });
    } else {
      setUploadError("이미지 업로드에 실패했어요. 다시 시도해주세요.");
    }
    e.target.value = "";
  }

  function handleRemove() {
    onChange({ imageUrl: "", zoom: 1, positionX: 0.5, positionY: 0.5 });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!value.imageUrl) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { startX: e.clientX, startY: e.clientY, posX: value.positionX, posY: value.positionY };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragging.current.startX) / rect.width;
    const dy = (e.clientY - dragging.current.startY) / rect.height;
    // 드래그 방향과 반대로 초점 이동 (이미지를 오른쪽으로 끌면 왼쪽 부분이 드러남)
    const nextX = clamp01(dragging.current.posX - dx / value.zoom);
    const nextY = clamp01(dragging.current.posY - dy / value.zoom);
    onChange({ ...value, positionX: nextX, positionY: nextY });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragging.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    dragging.current = null;
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{label}</p>
      )}

      {value.imageUrl ? (
        <div className="space-y-3">
          {fit === "contain" ? (
            // 원본 비율 사용 — 자르지 않고 원본 그대로 보여주므로 드래그/확대는 의미가 없어 정적
            // 미리보기만 노출한다. 고정 비율 박스에 억지로 넣지 않는다 — 회색 여백이 생기지 않도록
            // 이미지 자체의 크기(원본 비율)만큼만 영역을 차지하게 한다(실제 방문자 화면과 동일한 원칙).
            <div className="relative inline-block max-w-full" style={{ borderColor: "var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.imageUrl}
                alt="미리보기"
                className="block border"
                // 방문자 화면(episodes/[episodeId]/page.tsx)과 동일한 기준 높이(220px, 직접 Crop
                // 3:2 기준 가로 사진의 실제 렌더 높이) — 미리보기와 실제 결과가 최대한 같아 보이게.
                style={{ borderColor: "var(--border)", maxWidth: "100%", maxHeight: "220px", width: "auto", height: "auto" }}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <span className="text-xs" style={{ color: "#fff" }}>업로드 중...</span>
                </div>
              )}
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden border select-none touch-none"
              style={{ borderColor: "var(--border)", aspectRatio, cursor: "grab" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.imageUrl}
                alt="미리보기"
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
                style={{
                  objectPosition: `${value.positionX * 100}% ${value.positionY * 100}%`,
                  transform: `scale(${value.zoom})`,
                  transformOrigin: "center center",
                }}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <span className="text-xs" style={{ color: "#fff" }}>업로드 중...</span>
                </div>
              )}
              <div
                className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
              >
                드래그해서 위치 조절
              </div>
            </div>
          )}

          {fit === "cover" && (
            <div className="flex items-center gap-3">
              <span className="text-xs w-10 flex-shrink-0" style={{ color: "var(--dim)" }}>확대</span>
              <input
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.05}
                value={value.zoom}
                onChange={(e) => onChange({ ...value, zoom: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs w-10 text-right flex-shrink-0" style={{ color: "var(--dim)" }}>
                {Math.round(value.zoom * 100)}%
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <label className="flex-1 text-xs text-center py-2 border cursor-pointer transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              이미지 교체
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs px-3 py-2 border transition-colors hover:border-red-500 hover:text-red-500"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              삭제
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, zoom: 1, positionX: 0.5, positionY: 0.5 })}
              className="text-xs px-3 py-2 border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              초기화
            </button>
          </div>
        </div>
      ) : (
        <label className="block cursor-pointer">
          <div
            className="w-full border flex items-center justify-center overflow-hidden relative"
            style={{ borderColor: "var(--border)", aspectRatio }}
          >
            <span className="text-xs" style={{ color: "var(--dim)" }}>클릭해서 이미지 선택</span>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                <span className="text-xs" style={{ color: "#fff" }}>업로드 중...</span>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      )}

      {uploadError && <p className="text-xs" style={{ color: "#e05" }}>{uploadError}</p>}
    </div>
  );
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
