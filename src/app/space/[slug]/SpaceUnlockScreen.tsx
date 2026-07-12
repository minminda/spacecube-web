"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/* ── Cube Unlock 인트로 ──────────────────────────────────────
   QR 스캔(?src=qr) 진입 시에만 표시되는 약 4초 리츄얼 화면.
   Phase 1 (0~0.5s)     큐브 fade-in + scale 0.95→1
   Phase 2 (0.5~2.9s)   엣지 글로우 펄스 (기대감을 쌓는 여백 구간)
   Phase 3 (2.9~3.4s)   앞면이 문처럼 열림
   Phase 4 (3.55s~)     화면 전체가 공간 페이지로 페이드
   기존보다 약 1초 더 머물러 Apple 스타일처럼 조용하고 여유 있게 전환한다.
   종료 후 URL에서 src 파라미터를 제거해 새로고침/뒤로가기 시
   재생되지 않게 한다.
──────────────────────────────────────────────────────────── */

const PLAY_MS = 3550;
const FADE_MS = 450;

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
          animation: unlockEnter 0.5s ease-out both;
        }
        .unlock-cube {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: unlockDrift 3.55s ease-in-out both;
        }
        .unlock-face {
          position: absolute;
          inset: 0;
          border: 1.5px solid #141414;
          background: transparent;
          animation: unlockPulse 1s ease-in-out 0.5s 2;
        }
        .uf-front {
          transform: translateZ(48px);
          transform-origin: left center;
          animation:
            unlockPulse 1s ease-in-out 0.5s 2,
            unlockDoor 0.5s cubic-bezier(0.45, 0, 0.2, 1) 2.9s forwards;
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
          animation: unlockText 0.6s ease-out 0.35s both;
        }
        .unlock-sub {
          margin-top: 10px;
          font-size: 0.75rem;
          letter-spacing: 0.02em;
          color: #9a9a9a;
          animation: unlockText 0.6s ease-out 0.55s both;
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
