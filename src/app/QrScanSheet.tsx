"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ── QR 스캔 안내 Bottom Sheet ────────────────────────────────
   웹 내 QR 디코딩(html5-qrcode)은 인식률·기기 편차 문제로 제거.
   대신 기기의 "기본 카메라 앱 경험"으로 안내한다.

   핵심 트릭: <input type="file" capture="environment">는
   iOS Safari·Android Chrome 모두에서 표준으로 지원되는 네이티브
   카메라 캡처 화면을 그대로 띄운다. 이 화면은 실제 카메라 앱과
   동일한 뷰파인더라서, OS의 시스템 QR 인식(iOS의 노란 배너 등)이
   그대로 동작한다 — 사용자가 그 배너를 탭하면 브라우저가 그 URL을
   열며 우리 페이지를 벗어난다. 즉 "카메라 열기 → QR 스캔 →
   링크 터치 → 공간 페이지" 흐름을 표준 웹 API만으로 만족시킨다.
   캡처된 파일 자체는 쓸모없으므로 어떤 디코딩도 하지 않고 버린다.

   데스크톱 등 모바일 카메라가 없는 환경에서는 애초에 input을
   트리거하지 않고, 기본 카메라 앱을 직접 쓰라는 안내만 보여준다.
──────────────────────────────────────────────────────────── */

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}

function CameraLineIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="5" y="12" width="30" height="21" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 12 L16.5 8 H23.5 L26 12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="20" cy="22.5" r="6.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const STEPS = [
  "카메라를 열어주세요.",
  "공간큐브 QR을 비춰주세요.",
  "화면에 나타나는 링크를 눌러주세요.",
];

export default function QrScanSheet() {
  const [open, setOpen] = useState(false);
  const [showDesktopNotice, setShowDesktopNotice] = useState(false);
  const captureInputRef = useRef<HTMLInputElement>(null);

  function openSheet() {
    setShowDesktopNotice(false);
    setOpen(true);
  }

  function closeSheet() {
    setOpen(false);
  }

  function handleOpenCamera() {
    if (isMobileDevice()) {
      captureInputRef.current?.click();
    } else {
      setShowDesktopNotice(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="block w-full text-center text-base font-semibold py-4 transition-opacity hover:opacity-85"
        style={{ background: "var(--fg)", color: "var(--bg)" }}
      >
        QR 스캔하기
      </button>

      {/* 캡처된 사진은 사용하지 않음 — 네이티브 카메라 뷰를 여는 용도로만 사용 */}
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { e.target.value = ""; }}
        className="hidden"
      />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={closeSheet}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl"
              style={{ background: "var(--bg)" }}
            >
              <div className="mx-auto max-w-sm px-6 pt-3 pb-9 space-y-6">
                <div className="flex justify-center">
                  <div className="w-9 h-1 rounded-full" style={{ background: "var(--border)" }} />
                </div>

                <div className="space-y-4">
                  <div style={{ color: "var(--fg)" }}><CameraLineIcon /></div>
                  <h2 className="text-lg font-bold">공간큐브 QR 스캔</h2>
                </div>

                <div className="space-y-3">
                  <p className="text-sm" style={{ color: "var(--dim)" }}>
                    공간큐브 QR을 스캔하려면
                  </p>
                  <ol className="space-y-2">
                    {STEPS.map((step, i) => (
                      <li key={step} className="flex gap-3 text-sm leading-relaxed">
                        <span style={{ color: "var(--border)" }}>{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleOpenCamera}
                    className="block w-full text-center text-base font-semibold py-3.5 rounded-full transition-opacity hover:opacity-85"
                    style={{ background: "var(--fg)", color: "var(--bg)" }}
                  >
                    카메라 열기
                  </button>
                  <p className="text-xs text-center leading-relaxed" style={{ color: "var(--border)" }}>
                    iPhone과 Android 모두 기본 카메라에서
                    <br />
                    QR을 인식할 수 있습니다.
                  </p>
                </div>

                {showDesktopNotice && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs leading-relaxed text-center px-4 py-3 rounded-2xl"
                    style={{ background: "var(--tag-bg)", color: "var(--dim)" }}
                  >
                    브라우저에서는 카메라 앱을 직접 실행할 수 없습니다.
                    <br />
                    기본 카메라 앱을 열어 공간큐브 QR을 스캔해주세요.
                  </motion.p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
