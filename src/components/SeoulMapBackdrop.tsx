/* ── 공간 둘러보기 SVG 지도 공용 배경(격자+한강) ─────────────────────
   지역별 도형은 없고(관리자가 마커 X/Y만 편집), 배경만 모든 화면이
   공유한다 — 관리자 미리보기(DistrictManager)와 사용자 지역 선택
   화면(DiscoverEntry)이 이 컴포넌트 하나를 함께 쓴다. ──────────── */

export const SEOUL_MAP_VIEWBOX = "0 0 310 390";

const HAN_RIVER_PATH = "M 15,265 Q 90,250 160,264 Q 222,278 295,260";

export default function SeoulMapBackdrop({ idSuffix = "" }: { idSuffix?: string }) {
  const gridId = `seoulgrid${idSuffix}`;
  return (
    <>
      <defs>
        <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="20" y2="0" stroke="currentColor" strokeWidth="0.3" opacity="0.13" />
          <line x1="0" y1="0" x2="0" y2="20" stroke="currentColor" strokeWidth="0.3" opacity="0.13" />
        </pattern>
      </defs>
      <rect width="310" height="390" fill={`url(#${gridId})`} />
      <path d={HAN_RIVER_PATH} fill="none" stroke="currentColor" strokeWidth="13" opacity="0.07" strokeLinecap="round" />
      <path d={HAN_RIVER_PATH} fill="none" stroke="currentColor" strokeWidth="6" opacity="0.1" strokeLinecap="round" />
    </>
  );
}
