"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Html5Qrcode } from "html5-qrcode";

/* ── QR 스캐너 (브라우저 전용) ────────────────────────────────
   카메라 실시간 스캔 + 사진 업로드 스캔을 모두 지원한다.
   html5-qrcode의 저수준 Html5Qrcode 클래스만 사용해 UI를 직접
   구성한다 (Html5QrcodeScanner는 자체 UI가 있어 톤이 안 맞음).
   인식된 텍스트에서 slug만 뽑아 Next 라우터로 이동 — 원본 URL로
   직접 이동하지 않으므로 외부 도메인 QR이어도 안전하다.
──────────────────────────────────────────────────────────── */

const READER_ID = "qr-reader-region";

type CameraState = "starting" | "active" | "unavailable";

/** QR 원문에서 /space/[slug] 형태의 slug를 추출. 절대 URL·상대 경로 모두 처리 */
function extractSpaceSlug(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  let pathname = text;
  try {
    pathname = new URL(text).pathname;
  } catch {
    // 절대 URL이 아니면 원문을 경로로 취급 (예: "/space/buk")
  }

  const match = pathname.match(/^\/space\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function QrScanner() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningStateValueRef = useRef(2); // Html5QrcodeScannerState.SCANNING (동적 import 후 정확한 값으로 갱신)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigatingRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function isScanning() {
    return scannerRef.current?.getState() === scanningStateValueRef.current;
  }

  function goToSlug(slug: string) {
    navigatingRef.current = true;
    setMessage(null);
    router.push(`/space/${slug}?src=qr`);
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraState("unavailable");
        setMessage("이 브라우저는 카메라 스캔을 지원하지 않아요. 사진으로 인식해주세요.");
        return;
      }

      const { Html5Qrcode, Html5QrcodeScannerState } = await import("html5-qrcode");
      if (cancelled) return;
      scanningStateValueRef.current = Html5QrcodeScannerState.SCANNING;

      const instance = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = instance;

      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (navigatingRef.current) return; // 중복 콜백 방지
            const slug = extractSpaceSlug(decodedText);
            if (!slug) { setMessage("공간큐브 QR이 아닙니다."); return; }
            goToSlug(slug);
          },
          () => {/* 프레임마다 QR 미검출 — 정상 상태라 무시 */},
        );
        if (!cancelled) setCameraState("active");
      } catch {
        if (!cancelled) {
          setCameraState("unavailable");
          setMessage("카메라를 사용할 수 없어요. 권한을 확인하거나 사진으로 인식해주세요.");
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
      if (isScanning()) {
        scannerRef.current?.stop().catch(() => {/* 이미 정지된 경우 무시 */});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 가능하게
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      // 카메라가 돌고 있으면 먼저 멈춰서 리소스 충돌 방지
      if (isScanning()) {
        await scannerRef.current!.stop();
        setCameraState("unavailable");
      }
      if (!scannerRef.current) {
        const { Html5Qrcode } = await import("html5-qrcode");
        scannerRef.current = new Html5Qrcode(READER_ID, { verbose: false });
      }

      const decodedText = await scannerRef.current.scanFile(file, false);
      const slug = extractSpaceSlug(decodedText);
      if (!slug) { setMessage("공간큐브 QR이 아닙니다."); return; }
      goToSlug(slug);
    } catch {
      setMessage("QR을 찾지 못했습니다. 조금 더 선명한 사진을 사용해주세요.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div
        className="relative w-full max-w-xs aspect-square overflow-hidden border"
        style={{ borderColor: "var(--border)" }}
      >
        <div id={READER_ID} className="w-full h-full" />
        {cameraState === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--bg)" }}>
            <p className="text-xs" style={{ color: "var(--dim)" }}>카메라를 여는 중...</p>
          </div>
        )}
      </div>

      <div className="text-center space-y-2 max-w-xs min-h-[2.5rem]">
        {message ? (
          <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{message}</p>
        ) : cameraState === "active" ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>큐브의 QR을 화면 안에 맞춰주세요.</p>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="w-full max-w-xs space-y-2">
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          className="block w-full text-center text-sm font-medium py-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-50"
          style={{ borderColor: "var(--fg)" }}
        >
          {uploading ? "인식하는 중..." : "사진에서 QR 인식하기"}
        </button>
        <p className="text-xs text-center" style={{ color: "var(--border)" }}>
          사진 속 QR을 인식할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
