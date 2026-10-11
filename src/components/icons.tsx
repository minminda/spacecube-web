/* ── 내비게이션 · 행동 아이콘(벡터) ─────────────────────────────────────────────
   프로젝트에는 아이콘 라이브러리가 없어, Lucide와 같은 선 스타일(24 × 24 · 1.75px 선 · 둥근 끝)의 가벼운 SVG를 직접 둔다.
   이모지는 쓰지 않는다. 색은 currentColor — 글자색을 그대로 따라가므로 라이트 · 다크 어디서나 같다.
   장식이므로 aria-hidden(이름은 버튼 · 링크의 글자나 aria-label이 맡는다). */

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function Svg({ className = "w-6 h-6", strokeWidth = 1.75, fill = "none", children }: IconProps & { fill?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {children}
    </svg>
  );
}

export function HomeIcon(p: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p} fill={p.filled ? "currentColor" : "none"}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.4-4.4" />
    </Svg>
  );
}

/** 내 공간 — 책갈피. 공간 카드의 저장(북마크)과 같은 모양이라 "저장한 것이 쌓이는 곳"으로 읽힌다. */
export function BookmarkIcon(p: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p} fill={p.filled ? "currentColor" : "none"}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1z" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

/** 별 — 저장 안 됨은 윤곽선, 저장됨은 같은 색으로 채움(노란색 · 장식 없음) */
export function StarIcon(p: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p} fill={p.filled ? "currentColor" : "none"}>
      <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" />
    </Svg>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  );
}

export function LogInIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="m10 16 4-4-4-4M14 12H4" />
    </Svg>
  );
}

export function LogOutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="m16 16 4-4-4-4M20 12H10" />
    </Svg>
  );
}

export function MapPinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s-7-6.2-7-11.2A7 7 0 0 1 19 9.8C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}
