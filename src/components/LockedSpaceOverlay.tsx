/* ── 잠긴 공간 카드 사진 오버레이 ──────────────────────────────────
   자물쇠 아이콘 대신 공간큐브의 와이어프레임 큐브 언어(CubeReactionIcon,
   SpaceUnlockScreen과 동일 실루엣)를 재사용해 "아직 열리지 않은 큐브"라는
   인상을 전달한다. 사진을 흐리게+어둡게 가라앉히고 중앙에 큐브 실루엣만
   띄운다 — 여러 공간 카드 컴포넌트(SpaceDiscoveryCard, RecommendationCard)가
   이 오버레이 하나를 공유한다. ──────────────────────────────────── */

export default function LockedSpaceOverlay() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(10,10,10,0.5)", backdropFilter: "blur(1.5px)" }}
    >
      <svg viewBox="0 0 24 24" className="w-11 h-11" style={{ color: "#ffffff" }}>
        <polygon
          points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25"
          fill="currentColor"
          fillOpacity={0.14}
          stroke="currentColor"
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        <polyline
          points="3.5,7.25 12,12 20.5,7.25"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
        <line x1="12" y1="12" x2="12" y2="21.5" stroke="currentColor" strokeWidth={1.1} />
      </svg>
    </div>
  );
}
