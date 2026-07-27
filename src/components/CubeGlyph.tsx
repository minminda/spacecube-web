/* ── 공간큐브 와이어프레임 큐브 도형(공용) ────────────────────────────────
   등각 투영 큐브를 육각형 외곽선 하나 + 상단면 꺾은선 + 앞면 세로선, 총 3개
   도형만으로 표현한다(LockedSpaceOverlay가 처음 쓰던 도형을 그대로 추출).
   viewBox "0 0 24 24" 기준, 중심 (12,12) — 사용하는 쪽에서 원하는 크기로
   <svg>에 담아 쓴다(이 컴포넌트는 <svg> 래퍼를 갖지 않는다).
   LockedSpaceOverlay(잠긴 공간, 항상 채움+큰 크기)와 DistrictMapMarker(지역
   선택, 기본 외곽선만+작은 크기)가 이 하나를 공유한다 — 큐브 SVG를 복제하지 않는다. ── */

interface Props {
  /** 내부를 currentColor로 채울지 — 기본 false(외곽선만). */
  filled?: boolean;
  fillOpacity?: number;
  /** 육각형 외곽선 두께 */
  outlineWidth?: number;
  /** 상단면 꺾은선 + 앞면 세로선(내부 엣지) 두께 */
  edgeWidth?: number;
  /** 점선 처리 — 관리자 HIDDEN 상태 등에 사용 */
  dashed?: boolean;
}

export default function CubeGlyph({
  filled = false,
  fillOpacity = 0.16,
  outlineWidth = 1.3,
  edgeWidth = 1.1,
  dashed = false,
}: Props) {
  const dashArray = dashed ? "2 1.6" : undefined;
  return (
    <>
      <polygon
        points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? fillOpacity : undefined}
        stroke="currentColor"
        strokeWidth={outlineWidth}
        strokeLinejoin="round"
        strokeDasharray={dashArray}
      />
      <polyline
        points="3.5,7.25 12,12 20.5,7.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={edgeWidth}
        strokeLinejoin="round"
        strokeDasharray={dashArray}
      />
      <line x1="12" y1="12" x2="12" y2="21.5" stroke="currentColor" strokeWidth={edgeWidth} strokeDasharray={dashArray} />
    </>
  );
}
