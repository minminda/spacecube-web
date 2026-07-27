/* ── 공간 둘러보기 SVG 지도의 지역 마커 — 사용자 화면(DiscoverEntry)과
   관리자 미리보기/드래그 편집(DistrictManager)이 완전히 동일한 렌더를
   공유한다. 얇은 선 등각 큐브(CubeGlyph, 잠긴 공간 오버레이와 도형 공유)
   + 지역명만 표시하고 테두리/카드형 박스는 쓰지 않는다.
   ACTIVE=얇은 외곽선(선택 순간엔 채움), COMING_SOON=낮은 opacity+약한 흐림,
   HIDDEN은 관리자 화면에서만 위치를 찾을 수 있게 점선 표시. ── */

import CubeGlyph from "./CubeGlyph";

export type DistrictMarkerStatus = "ACTIVE" | "COMING_SOON" | "HIDDEN";

interface Props {
  name: string;
  x: number;
  y: number;
  status: DistrictMarkerStatus;
  /** 클릭~페이지 이동 사이(확대 애니메이션 진행 중) 등, "지금 이 지역을 골랐다"를 나타낼 때만 true. */
  selected?: boolean;
}

/** x,y를 중심으로 한 변 size인 정사각형 안에 24x24 큐브 도형을 그린다. */
function CubeIcon({ x, y, size, filled, fillOpacity, outlineWidth, edgeWidth, dashed }: {
  x: number; y: number; size: number;
  filled?: boolean; fillOpacity?: number; outlineWidth?: number; edgeWidth?: number; dashed?: boolean;
}) {
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 24 24" overflow="visible">
      <CubeGlyph filled={filled} fillOpacity={fillOpacity} outlineWidth={outlineWidth} edgeWidth={edgeWidth} dashed={dashed} />
    </svg>
  );
}

export default function DistrictMapMarker({ name, x, y, status, selected = false }: Props) {
  if (status === "HIDDEN") {
    return (
      <g opacity={0.3}>
        <CubeIcon x={x} y={y} size={8} dashed outlineWidth={0.9} edgeWidth={0.8} />
        <text
          x={x} y={y - 9} textAnchor="middle" fontSize="6.5"
          fill="currentColor" opacity={0.6}
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {name} (숨김)
        </text>
      </g>
    );
  }

  const isActive = status === "ACTIVE";

  if (!isActive) {
    // COMING_SOON — 낮은 불투명도 + 약한 흐림으로만 구분(별도 텍스트 배지 없음, 기존 정책 유지)
    return (
      <g opacity={0.4} style={{ filter: "blur(0.5px)" }}>
        <CubeIcon x={x} y={y} size={10} outlineWidth={1.1} edgeWidth={0.9} />
        <text
          x={x} y={y - 10} textAnchor="middle" fontSize="7.5"
          fill="currentColor" opacity={0.38}
          style={{ fontFamily: "system-ui, sans-serif", fontWeight: 400 }}
        >
          {name}
        </text>
      </g>
    );
  }

  return (
    <g>
      {selected ? (
        <CubeIcon x={x} y={y} size={13} filled fillOpacity={0.18} outlineWidth={1.7} edgeWidth={1.3} />
      ) : (
        <CubeIcon x={x} y={y} size={12} outlineWidth={1.3} edgeWidth={1.1} />
      )}
      <text
        x={x} y={y - 10} textAnchor="middle" fontSize="7.5"
        fill="currentColor" opacity={0.92}
        style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600 }}
      >
        {name}
      </text>
    </g>
  );
}
