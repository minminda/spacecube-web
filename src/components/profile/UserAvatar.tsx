import { avatarSpec } from "@/lib/people/avatar";

/**
 * 사람 아바타 — 프로필 사진이 있으면 그 사진, 없으면 seed(user.id)로 정해지는 추상 벡터 초상(lib/people/avatar.ts).
 * 정사각형. size를 주면 고정 크기, 없으면 부모 폭을 채운다(그리드 카드). 이름이 옆에 함께 보이므로 기본은 장식(aria-hidden).
 */
export default function UserAvatar({ seed, image, size, label }: { seed: string; image?: string | null; size?: number; label?: string }) {
  const box = size ? { width: size, height: size } : { width: "100%", aspectRatio: "1 / 1" };
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 로그인 제공자 프로필 이미지(외부 도메인)
      <img src={image} alt={label ?? ""} aria-hidden={label ? undefined : true} className="block shrink-0 object-cover" style={{ ...box, background: "var(--ed-soft)" }} />
    );
  }
  const a = avatarSpec(seed);
  const { bg, main, accent } = a.palette;
  const headFill = a.headAccent ? accent : main;
  const x = 20 + a.shift;
  return (
    <svg
      viewBox="0 0 40 40"
      className="block shrink-0"
      style={box}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect width="40" height="40" fill={bg} />
      {a.mark === "line" && <rect x="5" y="8" width="11" height="1.6" fill={accent} />}
      {a.mark === "dot" && <circle cx="32" cy="8" r="2" fill={accent} />}
      {a.mark === "sun" && <circle cx="31" cy="9" r="4.5" fill={accent} />}
      {a.body === "disc" && <circle cx={x} cy="47" r="17" fill={main} />}
      {a.body === "arch" && <path d={`M${x - 13} 40 V32 a13 13 0 0 1 26 0 V40 Z`} fill={main} />}
      {a.body === "block" && <rect x={x - 11} y="30" width="22" height="10" fill={main} />}
      {a.head === "circle" && <circle cx={x} cy="18" r="7" fill={headFill} />}
      {a.head === "square" && <rect x={x - 6.5} y="11" width="13" height="13" fill={headFill} />}
      {a.head === "half" && <path d={`M${x - 7.5} 22 a7.5 7.5 0 0 1 15 0 Z`} fill={headFill} />}
      {a.head === "ring" && <circle cx={x} cy="18" r="6" fill="none" stroke={headFill} strokeWidth="2.2" />}
    </svg>
  );
}
