"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ── QR 스캔 안내 Bottom Sheet ────────────────────────────────
   웹 내 QR 디코딩(html5-qrcode)은 인식률·기기 편차 문제로 제거.

   중요: 웹페이지는 iOS Safari에서 Camera.app을 열 방법이 아예
   없다(애플이 막아둠). <input capture>로 여는 카메라 캡처 화면도
   시도해봤지만 실시간 QR 배너가 뜨는 진짜 카메라 앱과 달라
   인식이 안 되는 걸 확인함 — 그래서 "자동으로 열어주는 척"하는
   버튼을 없애고, 사용자가 직접 카메라 앱으로 전환하도록 명확히
   안내만 하는 방식으로 정리했다. 실패할 수 있는 트릭보다
   100% 예측 가능한 안내가 "실패 없는 경험"에 더 가깝다.
──────────────────────────────────────────────────────────── */

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
  "홈 화면 또는 잠금 화면에서 카메라 앱을 열어주세요.",
  "공간큐브 QR을 비춰주세요.",
  "화면에 나타나는 링크를 눌러주세요.",
];

export default function QrScanSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-center text-base font-semibold py-4 transition-opacity hover:opacity-85"
        style={{ background: "var(--fg)", color: "var(--bg)" }}
      >
        QR 스캔하기
      </button>

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
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl"
              style={{ background: "var(--bg)" }}
            >
              <div
                className="mx-auto max-w-sm px-6 pt-3 space-y-6"
                style={{ paddingBottom: "calc(2.25rem + env(safe-area-inset-bottom))" }}
              >
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
                    onClick={() => setOpen(false)}
                    className="block w-full text-center text-base font-semibold py-3.5 rounded-full transition-opacity hover:opacity-85"
                    style={{ background: "var(--fg)", color: "var(--bg)" }}
                  >
                    확인했어요
                  </button>
                  <p className="text-xs text-center leading-relaxed" style={{ color: "var(--border)" }}>
                    iPhone과 Android 모두 기본 카메라에서
                    <br />
                    QR을 인식할 수 있습니다.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
