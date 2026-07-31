"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CubeGlyph from "@/components/CubeGlyph";

/* ── QR 스캔 안내 Bottom Sheet ────────────────────────────────
   웹 내 QR 디코딩(html5-qrcode)은 인식률·기기 편차 문제로 제거.

   중요: 웹페이지는 iOS Safari에서 Camera.app을 열 방법이 아예
   없다(애플이 막아둠). <input capture>로 여는 카메라 캡처 화면도
   시도해봤지만 실시간 QR 배너가 뜨는 진짜 카메라 앱과 달라
   인식이 안 되는 걸 확인함 — 그래서 "자동으로 열어주는 척"하는
   버튼을 없애고, 사용자가 직접 카메라 앱으로 전환하도록 명확히
   안내만 하는 방식으로 정리했다. 실패할 수 있는 트릭보다
   100% 예측 가능한 안내가 "실패 없는 경험"에 더 가깝다.

   2단계 구성: 첫 방문자는 "공간큐브를 만나는 순서"(intro)를 먼저 보고
   "QR 스캔 시작"을 눌러야 실제 카메라 안내(howto)로 넘어간다. 한 번
   intro를 통과하면 localStorage에 기록해, 이후 방문에서는 QR 스캔하기를
   누르는 즉시 howto로 바로 진입한다(재안내로 매번 흐름을 막지 않기 위함). ──*/

const SEEN_INTRO_KEY = "qr-intro-seen";

function CameraLineIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="5" y="12" width="30" height="21" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 12 L16.5 8 H23.5 L26 12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="20" cy="22.5" r="6.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const HOWTO_STEPS = [
  "홈 화면 또는 잠금 화면에서 카메라 앱을 열어주세요",
  "공간큐브 QR을 비춰주세요",
  "화면에 나타나는 링크를 눌러주세요",
];

const INTRO_STEPS = [
  "공간에 놓인 큐브를 발견해요",
  "QR을 스캔해 공간의 이야기를 만나요",
  "경험을 기록하고 흔적을 남겨보세요",
  "나와 맞는 다음 공간을 발견해보세요",
];

type Step = "intro" | "howto";

export default function QrScanSheet() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("howto");

  function handleOpen() {
    const seenIntro = typeof window !== "undefined" && window.localStorage.getItem(SEEN_INTRO_KEY) === "1";
    setStep(seenIntro ? "howto" : "intro");
    setOpen(true);
  }

  function startScan() {
    window.localStorage.setItem(SEEN_INTRO_KEY, "1");
    setStep("howto");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
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

                <AnimatePresence mode="wait">
                  {step === "intro" ? (
                    <motion.div
                      key="intro"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div style={{ color: "var(--fg)" }}>
                          <svg viewBox="0 0 24 24" width="40" height="40">
                            <CubeGlyph outlineWidth={1.4} edgeWidth={1.2} />
                          </svg>
                        </div>
                        <h2 className="text-lg font-bold">공간큐브를 만나는 순서</h2>
                      </div>

                      <ol className="space-y-3">
                        {INTRO_STEPS.map((s, i) => (
                          <li key={s} className="flex gap-3 text-sm leading-relaxed">
                            <span style={{ color: "var(--border)" }}>{i + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>

                      <button
                        type="button"
                        onClick={startScan}
                        className="block w-full text-center text-base font-semibold py-3.5 rounded-full transition-opacity hover:opacity-85"
                        style={{ background: "var(--fg)", color: "var(--bg)" }}
                      >
                        QR 스캔 시작
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="howto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div style={{ color: "var(--fg)" }}><CameraLineIcon /></div>
                        <h2 className="text-lg font-bold">공간큐브 QR 스캔</h2>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm" style={{ color: "var(--dim)" }}>
                          공간큐브 QR을 스캔하려면
                        </p>
                        <ol className="space-y-2">
                          {HOWTO_STEPS.map((s, i) => (
                            <li key={s} className="flex gap-3 text-sm leading-relaxed">
                              <span style={{ color: "var(--border)" }}>{i + 1}</span>
                              <span>{s}</span>
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
                          QR을 인식할 수 있습니다
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
