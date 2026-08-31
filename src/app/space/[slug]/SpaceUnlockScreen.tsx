"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/* ── Cube Unlock 인트로 ──────────────────────────────────────
   QR 스캔(?src=qr) 진입 시에만 표시되는 짧은 리츄얼 화면 — 실사용 파일럿에서 QR 진입
   구간 이탈이 관찰되어(PHASE 2) 총 체류시간을 약 0.5초(PLAY_MS 380ms + FADE_MS 120ms)로
   단축했다(기존 3초: PLAY_MS 2550ms + FADE_MS 450ms).
   개별 keyframe(@keyframes unlockEnter/unlockDrift/unlockPulse/unlockDoor/unlockText)의
   모양은 전혀 바꾸지 않았다 — 화면이 "확인된 이후 대기"만 줄이라는 요구사항에 맞춰,
   각 애니메이션의 duration/delay를 SCALE = 새 PLAY_MS / 기존 PLAY_MS(2550ms) 비율로
   전부 동일하게 압축했다. 즉 큐브 fade-in → 엣지 글로우 펄스 → 문 열림 → 텍스트가
   나타나는 순서와 상대적 타이밍(비율)은 기존과 완전히 같고, 재생 속도만 약 6.7배
   빨라졌다. 종료 후 URL에서 src 파라미터를 제거해 새로고침/뒤로가기 시 재생되지
   않게 한다.
──────────────────────────────────────────────────────────── */

const PLAY_MS = 380;
const FADE_MS = 120;

// 기존 안무(choreography) 비율 그대로 유지한 채 재생 속도만 압축한다(위 주석 참고).
const SCALE = PLAY_MS / 2550;
const SCENE_MS = Math.round(500 * SCALE);
const PULSE_MS = Math.round(1000 * SCALE);
const PULSE_DELAY_MS = Math.round(500 * SCALE);
const DOOR_MS = Math.round(500 * SCALE);
const DOOR_DELAY_MS = Math.round(1900 * SCALE);
const TITLE_MS = Math.round(600 * SCALE);
const TITLE_DELAY_MS = Math.round(350 * SCALE);
const SUB_MS = Math.round(600 * SCALE);
const SUB_DELAY_MS = Math.round(550 * SCALE);

export default function SpaceUnlockScreen() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromQr = searchParams.get("src") === "qr";

  const [stage, setStage] = useState<"play" | "fade" | "hidden">(
    fromQr ? "play" : "hidden",
  );

  useEffect(() => {
    if (stage === "play") {
      const t = setTimeout(() => setStage("fade"), PLAY_MS);
      return () => clearTimeout(t);
    }
    if (stage === "fade") {
      const t = setTimeout(() => {
        setStage("hidden");
        window.history.replaceState(null, "", pathname);
      }, FADE_MS);
      return () => clearTimeout(t);
    }
  }, [stage, pathname]);

  if (stage === "hidden") return null;

  return (
    <div
      aria-hidden
      onClick={() => stage === "play" && setStage("fade")}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "#FFFFFF",
        opacity: stage === "fade" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: stage === "fade" ? "none" : "auto",
      }}
    >
      {/* 큐브 */}
      <div className="unlock-scene">
        <div className="unlock-cube">
          <div className="unlock-face uf-front" />
          <div className="unlock-face uf-back" />
          <div className="unlock-face uf-right" />
          <div className="unlock-face uf-left" />
          <div className="unlock-face uf-top" />
          <div className="unlock-face uf-bottom" />
        </div>
      </div>

      {/* 텍스트 */}
      <p className="unlock-title">Cube Unlock.</p>
      <p className="unlock-sub">공간의 이야기를 여는 중</p>

      <style>{`
        .unlock-scene {
          width: 96px;
          height: 96px;
          perspective: 720px;
          animation: unlockEnter ${SCENE_MS}ms ease-out both;
        }
        .unlock-cube {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: unlockDrift ${PLAY_MS}ms ease-in-out both;
        }
        .unlock-face {
          position: absolute;
          inset: 0;
          border: 1.5px solid #141414;
          background: transparent;
          animation: unlockPulse ${PULSE_MS}ms ease-in-out ${PULSE_DELAY_MS}ms 1;
        }
        .uf-front {
          transform: translateZ(48px);
          transform-origin: left center;
          animation:
            unlockPulse ${PULSE_MS}ms ease-in-out ${PULSE_DELAY_MS}ms 1,
            unlockDoor ${DOOR_MS}ms cubic-bezier(0.45, 0, 0.2, 1) ${DOOR_DELAY_MS}ms forwards;
        }
        .uf-back   { transform: rotateY(180deg) translateZ(48px); }
        .uf-right  { transform: rotateY(90deg)  translateZ(48px); }
        .uf-left   { transform: rotateY(-90deg) translateZ(48px); }
        .uf-top    { transform: rotateX(90deg)  translateZ(48px); }
        .uf-bottom { transform: rotateX(-90deg) translateZ(48px); }

        .unlock-title {
          margin-top: 44px;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.22em;
          color: #111111;
          animation: unlockText ${TITLE_MS}ms ease-out ${TITLE_DELAY_MS}ms both;
        }
        .unlock-sub {
          margin-top: 10px;
          font-size: 0.75rem;
          letter-spacing: 0.02em;
          color: #9a9a9a;
          animation: unlockText ${SUB_MS}ms ease-out ${SUB_DELAY_MS}ms both;
        }

        @keyframes unlockEnter {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes unlockDrift {
          from { transform: rotateX(-26deg) rotateY(-42deg); }
          to   { transform: rotateX(-20deg) rotateY(-30deg); }
        }
        @keyframes unlockPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(0, 0, 0, 0); }
          50%      { box-shadow: 0 0 16px rgba(0, 0, 0, 0.14); }
        }
        @keyframes unlockDoor {
          from { transform: translateZ(48px) rotateY(0deg); }
          to   { transform: translateZ(48px) rotateY(-108deg); }
        }
        @keyframes unlockText {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .unlock-scene, .unlock-cube, .unlock-face,
          .uf-front, .unlock-title, .unlock-sub {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
