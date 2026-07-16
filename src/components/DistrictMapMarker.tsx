/* ── 공간 둘러보기 SVG 지도의 지역 마커 — 사용자 화면(DiscoverEntry)과
   관리자 미리보기/드래그 편집(DistrictManager)이 완전히 동일한 렌더를
   공유한다. 점(dot) + 지역명만 표시하고 테두리/카드형 박스는 쓰지 않는다.
   ACTIVE=선명, COMING_SOON=낮은 opacity+약한 흐림만으로 구분(별도 텍스트
   배지 없음), HIDDEN은 관리자 화면에서만 위치를 찾을 수 있게 점선 표시. ── */

export type DistrictMarkerStatus = "ACTIVE" | "COMING_SOON" | "HIDDEN";

interface Props {
  name: string;
  x: number;
  y: number;
  status: DistrictMarkerStatus;
}

export default function DistrictMapMarker({ name, x, y, status }: Props) {
  if (status === "HIDDEN") {
    return (
      <g opacity={0.3}>
        <circle cx={x} cy={y} r={4} fill="none" stroke="currentColor" strokeWidth={0.8} strokeDasharray="2 2" />
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
  return (
    <g>
      <circle
        cx={x} cy={y} r={isActive ? 5.5 : 4.5}
        fill="currentColor"
        fillOpacity={isActive ? 0.88 : 0.2}
        style={isActive ? undefined : { filter: "blur(0.5px)" }}
      />
      <text
        x={x} y={y - 10} textAnchor="middle" fontSize="7.5"
        fill="currentColor" opacity={isActive ? 0.92 : 0.38}
        style={{ fontFamily: "system-ui, sans-serif", fontWeight: isActive ? 600 : 400 }}
      >
        {name}
      </text>
    </g>
  );
}
