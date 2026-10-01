import CubeGlyph from "@/components/CubeGlyph";

interface Props {
  /** 한 변(px) — 카드 metadata는 14~16, 상세 헤더는 18~20 */
  size?: number;
  /** 심볼 옆에 "GONGGANCUBE PARTNER" 텍스트를 함께 표시(상세 페이지) */
  label?: boolean;
  className?: string;
}

/* ── GONGGANCUBE PARTNER MARK ─────────────────────────────────────────────
   예전 홈 Header 로고였던 큐브 와이어프레임(CubeGlyph — 같은 도형)을 재사용한다. 새 도형을 만들지 않는다.
   뜻: "이 공간에는 실제 GONGGANCUBE(Cube→Story→Record 현장 경험)가 있다" — 평가·인증·추천 등급이 아니다.
   cubeAvailable인 공간에만 쓴다. 색·배경·테두리 없이 currentColor 단색. Header/Footer 브랜드 표시에는 쓰지 않는다. ── */
export default function PartnerMark({ size = 15, label = false, className = "" }: Props) {
  const svg = (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" role={label ? undefined : "img"} aria-label={label ? undefined : "GONGGANCUBE Partner Space"} aria-hidden={label ? true : undefined}>
      {!label && <title>GONGGANCUBE Partner Space</title>}
      <CubeGlyph outlineWidth={1.5} edgeWidth={1.3} />
    </svg>
  );
  if (!label) return <span className={`inline-flex items-center ${className}`}>{svg}</span>;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {svg}
      <span className="ed-label">GONGGANCUBE PARTNER</span>
    </span>
  );
}
