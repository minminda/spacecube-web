"use client";

/* EXPERIMENTAL ONLY — 촬영 정렬 UX 개선(스펙 7번). 네이티브 카메라 앱은 HTML을 그
   위에 겹칠 수 없어서(오버레이 불가), 반투명 A4 가이드 프레임을 보여주려면 getUserMedia로
   직접 라이브 프리뷰를 그려야 한다. 이 컴포넌트가 바로 그 커스텀 카메라 뷰다.
   getUserMedia를 지원하지 않거나 권한이 거부되면 onUnavailable로 알려서, 호출부가 기존
   <input type=file capture> 방식으로 조용히 폴백하게 한다 — 이 UX가 실패해도 촬영 자체가
   막히지 않아야 한다. */
import { useEffect, useRef, useState } from "react";
import { CANVAS_W, CANVAS_H } from "@/lib/handwriting/sheetLayout";

const GUIDE_RATIO = CANVAS_W / CANVAS_H; // 종이 실제 비율과 맞춰야 "이 안에 맞추면" 실제로 맞다

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
  onUnavailable: () => void;
}

export default function CameraCapture({ onCapture, onCancel, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      onUnavailable();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          // 권한 거부 / 카메라 없음 / HTTPS 아님 등 — 조용히 파일 선택 방식으로 폴백.
          onUnavailable();
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleShoot() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("사진을 저장하지 못했습니다. 파일 선택으로 시도해주세요.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("사진을 저장하지 못했습니다. 파일 선택으로 시도해주세요.");
          return;
        }
        onCapture(new File([blob], `handwriting-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {/* 반투명 A4 가이드 프레임 + 네 모서리 표시 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
          <div
            className="relative"
            style={{
              width: `min(82vw, calc(78vh * ${GUIDE_RATIO}))`,
              aspectRatio: `${GUIDE_RATIO}`,
              border: "2px dashed rgba(255,255,255,0.85)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <div
                key={corner}
                className="absolute w-6 h-6"
                style={{
                  ...(corner.includes("t") ? { top: -2 } : { bottom: -2 }),
                  ...(corner.includes("l") ? { left: -2 } : { right: -2 }),
                  borderTop: corner.includes("t") ? "4px solid #7dd3fc" : "none",
                  borderBottom: corner.includes("b") ? "4px solid #7dd3fc" : "none",
                  borderLeft: corner.includes("l") ? "4px solid #7dd3fc" : "none",
                  borderRight: corner.includes("r") ? "4px solid #7dd3fc" : "none",
                }}
              />
            ))}
            <p
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm px-4"
              style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
            >
              종이 전체를 이 안에 맞춰주세요
            </p>
          </div>
        </div>

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-white/80">카메라를 준비하고 있습니다...</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-center py-2 px-4" style={{ color: "#ff8a80" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2 p-4 flex-shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] text-sm py-2.5 border text-white"
          style={{ borderColor: "rgba(255,255,255,0.4)" }}
        >
          취소하고 파일 선택
        </button>
        <button
          type="button"
          onClick={handleShoot}
          disabled={!ready}
          className="flex-[2] min-h-[44px] text-sm py-2.5 border font-medium disabled:opacity-40"
          style={{ borderColor: "#7dd3fc", color: "#7dd3fc" }}
        >
          촬영하기
        </button>
      </div>
    </div>
  );
}
