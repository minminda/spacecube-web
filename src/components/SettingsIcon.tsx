/* ── 설정 아이콘 — ⚙ 문자 대신 쓰는 얇은 선형 톱니바퀴 벡터 아이콘.
   currentColor를 써서 부모 텍스트 색(var(--dim) 등)을 그대로 물려받는다(LockIcon과 동일 관례). ── */

interface Props {
  className?: string;
}

const SPOKE_ANGLES_DEG = [0, 45, 90, 135, 180, 225, 270, 315];

export default function SettingsIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="1.8" fill="none" stroke="currentColor" strokeWidth={1.5} />
      {SPOKE_ANGLES_DEG.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return (
          <line
            key={deg}
            x1={12 + 5.6 * cos}
            y1={12 + 5.6 * sin}
            x2={12 + 7.8 * cos}
            y2={12 + 7.8 * sin}
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
