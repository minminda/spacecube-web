/* ── 방명록 캔버스 설정(배경·레이아웃) 저장 입력 파싱/검증 (관리자·운영자 공통) ──────
   /api/spaces/[id]/guestbook-settings(관리자, isAdmin)와
   /api/operator/spaces/[spaceId]/guestbook-settings(운영자, requireOperatorSpace)가
   공유하는 단일 검증 지점 — GuestbookSettings 모델(배경/레이아웃/초기 카메라 등)이
   대상이다. 방명록 세션 자체(질문·좌표·스타일)는 guestbookSessionInput.ts가 담당한다.
   순수 함수, 항상 성공한다(잘못된 값은 current로 조용히 폴백). ── */

const LAYOUT_TYPES = ["scatter", "grid", "radial"] as const;

export interface GuestbookCanvasSettingsInput {
  backgroundType: "color" | "image";
  backgroundColor: string;
  backgroundImageUrl: string;
  backgroundOpacity: number;
  layoutType: "scatter" | "grid" | "radial";
  defaultPostitColor: string;
  initialZoom: number;
  initialX: number;
  initialY: number;
  allowRotation: boolean;
  allowImage: boolean;
  showNickname: boolean;
}

/** GuestbookSettings 행이 아직 없는 공간(첫 저장)에 쓰는 기준값 — 기존 하드코딩 렌더링과 동일. */
export const DEFAULT_CANVAS_SETTINGS: GuestbookCanvasSettingsInput = {
  backgroundType: "color",
  backgroundColor: "#000000",
  backgroundImageUrl: "",
  backgroundOpacity: 1,
  layoutType: "scatter",
  defaultPostitColor: "#F6E7A8",
  initialZoom: 1,
  initialX: 0,
  initialY: 0,
  allowRotation: true,
  allowImage: true,
  showNickname: true,
};

/** GuestbookSettings 행이 하나도 없는 경우 undefined/null로 온다. */
export interface GuestbookSettingsRow {
  backgroundType: string;
  backgroundColor: string | null;
  backgroundImageUrl: string | null;
  backgroundOpacity: number;
  layoutType: string;
  defaultPostitColor: string;
  initialZoom: number;
  initialX: number;
  initialY: number;
  allowRotation: boolean;
  allowImage: boolean;
  showNickname: boolean;
}

/**
 * Prisma의 GuestbookSettings 행(backgroundType/layoutType이 plain string)을
 * GuestbookCanvasSettingsInput(좁은 유니온 타입)으로 정규화한다. 행이 없으면
 * DEFAULT_CANVAS_SETTINGS를 그대로 돌려준다 — API 라우트·페이지 양쪽에서 반복되던
 * `as "color"|"image"` 캐스팅을 한 곳으로 모았다.
 */
export function normalizeCanvasSettingsRow(row: GuestbookSettingsRow | null | undefined): GuestbookCanvasSettingsInput {
  if (!row) return DEFAULT_CANVAS_SETTINGS;
  return {
    backgroundType: row.backgroundType === "image" ? "image" : "color",
    backgroundColor: row.backgroundColor ?? DEFAULT_CANVAS_SETTINGS.backgroundColor,
    backgroundImageUrl: row.backgroundImageUrl ?? "",
    backgroundOpacity: row.backgroundOpacity,
    layoutType: LAYOUT_TYPES.includes(row.layoutType as (typeof LAYOUT_TYPES)[number])
      ? (row.layoutType as GuestbookCanvasSettingsInput["layoutType"])
      : "scatter",
    defaultPostitColor: row.defaultPostitColor,
    initialZoom: row.initialZoom,
    initialX: row.initialX,
    initialY: row.initialY,
    allowRotation: row.allowRotation,
    allowImage: row.allowImage,
    showNickname: row.showNickname,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function readNumber(body: Record<string, unknown>, key: string, fallback: number): number {
  const v = body[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function readBoolean(body: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = body[key];
  return typeof v === "boolean" ? v : fallback;
}

export function parseGuestbookCanvasSettingsInput(
  body: Record<string, unknown>,
  current: GuestbookCanvasSettingsInput = DEFAULT_CANVAS_SETTINGS,
): GuestbookCanvasSettingsInput {
  const layoutType = LAYOUT_TYPES.includes(body.layoutType as (typeof LAYOUT_TYPES)[number])
    ? (body.layoutType as GuestbookCanvasSettingsInput["layoutType"])
    : current.layoutType;
  const backgroundType = body.backgroundType === "image" || body.backgroundType === "color"
    ? body.backgroundType
    : current.backgroundType;

  return {
    backgroundType,
    backgroundColor: typeof body.backgroundColor === "string" && body.backgroundColor ? body.backgroundColor : current.backgroundColor,
    backgroundImageUrl: typeof body.backgroundImageUrl === "string" ? body.backgroundImageUrl : current.backgroundImageUrl,
    backgroundOpacity: clamp01(readNumber(body, "backgroundOpacity", current.backgroundOpacity)),
    layoutType,
    defaultPostitColor: typeof body.defaultPostitColor === "string" && body.defaultPostitColor ? body.defaultPostitColor : current.defaultPostitColor,
    initialZoom: readNumber(body, "initialZoom", current.initialZoom),
    initialX: readNumber(body, "initialX", current.initialX),
    initialY: readNumber(body, "initialY", current.initialY),
    allowRotation: readBoolean(body, "allowRotation", current.allowRotation),
    allowImage: readBoolean(body, "allowImage", current.allowImage),
    showNickname: readBoolean(body, "showNickname", current.showNickname),
  };
}
