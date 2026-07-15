/* ── 공감 아이콘 — 공간큐브의 와이어프레임 큐브 언어를 재사용한 작은 아이콘.
   SpaceUnlockScreen.tsx의 3D CSS 큐브(Cube Unlock)와 같은 "테두리만 있는 정육면체"
   실루엣을 아이콘 크기(SVG)로 옮긴 것 — 공감하지 않은 상태는 outline, 공감한 상태는
   내부가 옅게 채워진 filled 큐브로 표시한다. ──────────────────────────────── */

interface Props {
  active?: boolean;
  className?: string;
}

export default function CubeReactionIcon({ active = false, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25"
        fill="currentColor"
        fillOpacity={active ? 0.22 : 0}
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <polyline
        points="3.5,7.25 12,12 20.5,7.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <line x1="12" y1="12" x2="12" y2="21.5" stroke="currentColor" strokeWidth={1.2} />
    </svg>
  );
}
