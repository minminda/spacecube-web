/* ── Cube Unlock 대기 화면(정적) ──────────────────────────────
   QR 스캔 직후 목적지(cube 상태 조회 → SpaceScan 기록 → Episode 결정)가 결정되기 전까지
   흰/빈 화면 대신 즉시 보여주는 화면이다. 실제 "Cube Unlock 연출"(엣지 글로우 펄스 → 문 열림
   → 텍스트 등장 → 페이드)은 여기서 재생하지 않는다 — 그 리츄얼은 목적지 페이지의
   SpaceUnlockScreen에서 딱 한 번만 재생된다(중복 재생 금지). 이 화면은 등장(fade+scale)
   한 번만 하고 그대로 정지 상태로 "대기"한다 — 문이 아직 열리지 않은, 준비 중인 모습.
   서버 컴포넌트에서도 그대로 쓸 수 있도록 훅 없이 순수 마크업+CSS만 담는다(loading.tsx와
   클라이언트 브릿지 컴포넌트가 동일하게 재사용). SpaceUnlockScreen.tsx와 시각 언어(선 굵기,
   색상, 텍스트)는 맞추되, 애니메이션 로직은 의도적으로 완전히 분리해 서로 영향을 주지 않는다. ── */

export default function CubeUnlockHold() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "#FFFFFF" }}
    >
      <div className="unlock-hold-scene">
        <div className="unlock-hold-cube">
          <div className="unlock-hold-face uhf-front" />
          <div className="unlock-hold-face uhf-back" />
          <div className="unlock-hold-face uhf-right" />
          <div className="unlock-hold-face uhf-left" />
          <div className="unlock-hold-face uhf-top" />
          <div className="unlock-hold-face uhf-bottom" />
        </div>
      </div>

      <p className="unlock-hold-title">Cube Unlock.</p>
      <p className="unlock-hold-sub">공간의 이야기를 여는 중</p>

      <style>{`
        .unlock-hold-scene {
          width: 96px;
          height: 96px;
          perspective: 720px;
          animation: unlockHoldEnter 0.3s ease-out both;
        }
        .unlock-hold-cube {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transform: rotateX(-26deg) rotateY(-42deg);
        }
        .unlock-hold-face {
          position: absolute;
          inset: 0;
          border: 1.5px solid #141414;
          background: transparent;
        }
        .uhf-front  { transform: translateZ(48px); }
        .uhf-back   { transform: rotateY(180deg) translateZ(48px); }
        .uhf-right  { transform: rotateY(90deg)  translateZ(48px); }
        .uhf-left   { transform: rotateY(-90deg) translateZ(48px); }
        .uhf-top    { transform: rotateX(90deg)  translateZ(48px); }
        .uhf-bottom { transform: rotateX(-90deg) translateZ(48px); }

        .unlock-hold-title {
          margin-top: 44px;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.22em;
          color: #111111;
          animation: unlockHoldText 0.3s ease-out 0.05s both;
        }
        .unlock-hold-sub {
          margin-top: 10px;
          font-size: 0.75rem;
          letter-spacing: 0.02em;
          color: #9a9a9a;
          animation: unlockHoldText 0.3s ease-out 0.1s both;
        }

        @keyframes unlockHoldEnter {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes unlockHoldText {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .unlock-hold-scene, .unlock-hold-title, .unlock-hold-sub {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
