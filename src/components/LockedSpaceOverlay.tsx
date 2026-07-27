/* ── 잠긴 공간 카드 사진 오버레이 ──────────────────────────────────
   자물쇠 아이콘 대신 공간큐브의 와이어프레임 큐브 언어(CubeGlyph, 지역
   지도 마커 DistrictMapMarker와 도형을 공유)를 재사용해 "아직 열리지 않은
   큐브"라는 인상을 전달한다. 사진을 흐리게+어둡게 가라앉히고 중앙에 큐브
   실루엣만 띄운다 — 여러 공간 카드 컴포넌트(SpaceDiscoveryCard,
   RecommendationCard)가 이 오버레이 하나를 공유한다. ──────────────────────────────────── */

import CubeGlyph from "./CubeGlyph";

export default function LockedSpaceOverlay() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(10,10,10,0.5)", backdropFilter: "blur(1.5px)" }}
    >
      <svg viewBox="0 0 24 24" className="w-[38px] h-[38px]" style={{ color: "#ffffff" }}>
        <CubeGlyph filled fillOpacity={0.14} outlineWidth={1.3} edgeWidth={1.1} />
      </svg>
    </div>
  );
}
