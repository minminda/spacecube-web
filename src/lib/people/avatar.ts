/* ── 기본 벡터 아바타(순수 함수) ────────────────────────────────────────────────
   프로필 사진이 없는 사람에게 쓰는 추상 그래픽 초상 — 머리(도형) + 어깨(도형) + 작은 표식 하나.
   같은 seed(user.id)는 항상 같은 조합, 다른 사람은 다른 조합. 색은 흑백 · 무채색 · 따뜻한 회색만(알록달록 금지).
   실사 얼굴 · 이니셜 원형 배지 같은 SNS 표현은 쓰지 않는다. 정사각형(프로필 카드와 같은 1:1). ── */

export const AVATAR_PALETTES = [
  { bg: "#f2f2f2", main: "#111111", accent: "#9a9a9a" },
  { bg: "#111111", main: "#f2f2f2", accent: "#6f6f6f" },
  { bg: "#e6e2da", main: "#111111", accent: "#b5ad9f" },
  { bg: "#d9d9d9", main: "#111111", accent: "#f7f7f7" },
  { bg: "#c9c2b6", main: "#111111", accent: "#efebe4" },
  { bg: "#2b2b2b", main: "#e6e2da", accent: "#8c8577" },
] as const;

export const AVATAR_HEADS = ["circle", "square", "half", "ring"] as const;
export const AVATAR_BODIES = ["disc", "arch", "block"] as const;
export const AVATAR_MARKS = ["none", "line", "dot", "sun"] as const;

export interface AvatarSpec {
  palette: (typeof AVATAR_PALETTES)[number];
  head: (typeof AVATAR_HEADS)[number];
  body: (typeof AVATAR_BODIES)[number];
  mark: (typeof AVATAR_MARKS)[number];
  /** 머리를 어깨보다 accent 색으로 칠할지 */
  headAccent: boolean;
  /** 머리 · 어깨의 좌우 위치(-4 ~ 4) */
  shift: number;
}

/** FNV-1a 32비트 — 짧은 문자열을 고르게 섞는 결정적 해시 */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function avatarSpec(seed: string): AvatarSpec {
  let h = hashSeed(seed || "spacecube");
  const pick = <T,>(list: readonly T[]): T => {
    const v = list[h % list.length];
    h = Math.floor(h / list.length) ^ Math.imul(h, 0x9e3779b1) >>> 7;
    h >>>= 0;
    return v;
  };
  const palette = pick(AVATAR_PALETTES);
  const head = pick(AVATAR_HEADS);
  const body = pick(AVATAR_BODIES);
  const mark = pick(AVATAR_MARKS);
  const headAccent = pick([false, false, true]);
  const shift = pick([-4, -2, 0, 0, 2, 4]);
  return { palette, head, body, mark, headAccent, shift };
}
