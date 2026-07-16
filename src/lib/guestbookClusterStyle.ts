/* ── 방명록 질문 군집(자유/질문1/질문2) 글자 크기·색상 검증 유틸 ──────────────
   순수 함수만 모아둔다(Prisma/쿠키 의존 없음) — 관리자 저장 API와 미리보기 폼
   양쪽에서 동일한 기준으로 검증/클램프하기 위한 단일 출처. ──────────────── */

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 64;
/** UI 안내용 권장 범위 — 강제되는 값은 아니고, 관리자는 MIN~MAX 전체를 직접 입력할 수 있다. */
export const FONT_SIZE_RECOMMENDED_MIN = 16;
export const FONT_SIZE_RECOMMENDED_MAX = 40;

export const FONT_SIZE_PRESETS = {
  SMALL: 16,
  MEDIUM: 22,
  LARGE: 30,
  XL: 38,
} as const;

export const COLOR_PRESETS = {
  WHITE: "#FFFFFF",
  LIGHT_GRAY: "#CCCCCC",
  YELLOW: "#F5D76E",
  SKY_BLUE: "#7EC8E3",
  SOFT_PINK: "#F4A6BA",
  MINT: "#A8E6CF",
} as const;

export const DEFAULT_FREE_FONT_SIZE = 14;
export const DEFAULT_QUESTION_FONT_SIZE = 16;
export const DEFAULT_FREE_COLOR = "#8C8C8C";
export const DEFAULT_QUESTION_COLOR = "#EBEBEB";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

/** ITU-R BT.601 지각 밝기(0~255) — 순검정(#000) 배경 위 가독성 판단용 근사치. */
export function relativeLuma(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/** 배경(#000)에 비해 지나치게 어두워 읽기 힘든 색인지 — 6개 프리셋·기존 기본값은 전부 여유있게 통과한다. */
export const DARK_LUMA_THRESHOLD = 60;

export function isTooDarkForBlackBackground(hex: string): boolean {
  return relativeLuma(hex) < DARK_LUMA_THRESHOLD;
}

/**
 * 형식이 잘못됐거나 값이 없으면 기본색으로 조용히 폴백한다. 형식이 정상이면 어둡든 밝든
 * 그대로 저장한다 — 저장 차단은 하지 않고, 어두운 색 경고는 UI(관리자 폼)에서
 * isTooDarkForBlackBackground로 즉시 보여준다("저장 자체를 무조건 막을 필요는 없다").
 */
export function resolveClusterColor(input: unknown, fallback: string): string {
  return isValidHexColor(input) ? input : fallback;
}

/** 값이 없거나 숫자가 아니면 fallback, 범위를 벗어나면 클램프 — 항상 성공(거부하지 않음). */
export function clampFontSize(input: unknown, fallback: number): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));
}
