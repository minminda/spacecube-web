/* ── 방명록 포스트잇이 캔버스(world) 경계에 잘리지 않게 하는 좌표 계산 ─────────────────────
   캔버스 world는 WORLD_W×WORLD_H 크기의 overflow:hidden 영역이고, 팬은 world 경계까지만 된다(react-zoom-pan-pinch limitToBounds).
   그래서 포스트잇이 world 밖으로 조금이라도 나가 있으면 그 부분은 어떻게 이동해도 볼 수 없다.
   - 렌더 시 보정(clampNoteToWorld): 저장된 좌표는 그대로 두고, 화면에 그릴 위치만 회전까지 포함한 전체가 world 안에 들어오게 민다.
   - 새 위치 찾기(noteSafeBounds): 빈자리 탐색이 world 밖 후보를 고르지 않게 하는 top-left 허용 범위.
   - 샘플 배치(centerBiased): 군집 주변에 고르게가 아니라 가까운 쪽이 더 촘촘하게.
   순수 함수 — 클라이언트 캔버스 · 서버 · seed 스크립트가 같이 쓴다. ── */

import { POST_IT_HEIGHT, POST_IT_WIDTH } from "./postitCollision"; // 상대 경로 — seed 스크립트(tsx)에서도 그대로 불러온다

export const WORLD_W = 5000;
export const WORLD_H = 5000;
/** world 가장자리와 포스트잇 사이 최소 여백(world px) — 그림자 · NEW 배지 · 테이프 장식까지 잘리지 않게 */
export const NOTE_EDGE_MARGIN = 40;
/** 렌더 보정에서 가정하는 최대 회전(도) — 저장값이 이보다 커도 이 각도로 여유를 잡는다(회전은 보통 ±4° 이내) */
const MAX_ROTATION_DEG = 8;

export interface NoteBox {
  /** top-left 허용 범위 */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** w×h 상자를 deg만큼 돌렸을 때 원래 상자보다 한쪽으로 더 튀어나오는 길이(가로, 세로). */
export function rotatedOverhang(width: number, height: number, deg: number): { dx: number; dy: number } {
  const t = (Math.min(Math.abs(deg), 90) * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const rotatedW = width * cos + height * sin;
  const rotatedH = width * sin + height * cos;
  return { dx: Math.max(0, (rotatedW - width) / 2), dy: Math.max(0, (rotatedH - height) / 2) };
}

/** 포스트잇 전체(회전 포함)가 world 안에 여백을 두고 들어가는 top-left 범위. */
export function noteSafeBounds(
  rotationDeg = MAX_ROTATION_DEG,
  { width = POST_IT_WIDTH, height = POST_IT_HEIGHT, worldW = WORLD_W, worldH = WORLD_H, margin = NOTE_EDGE_MARGIN } = {},
): NoteBox {
  const { dx, dy } = rotatedOverhang(width, height, Math.max(Math.abs(rotationDeg), MAX_ROTATION_DEG));
  return {
    minX: margin + dx,
    minY: margin + dy,
    maxX: worldW - width - margin - dx,
    maxY: worldH - height - margin - dy,
  };
}

/**
 * 화면에 그릴 위치 — 저장된 좌표가 안전 범위 안이면 그대로, 밖이면 가장 가까운 안쪽으로 민다.
 * 저장값(DB)은 바꾸지 않는다. 예전에 경계 근처 · 밖에 놓인 글도 잘리지 않고 전부 보인다.
 */
export function clampNoteToWorld(note: { x: number; y: number; rotation?: number }, box: NoteBox = noteSafeBounds(note.rotation)): { x: number; y: number } {
  return {
    x: Math.min(Math.max(note.x, box.minX), box.maxX),
    y: Math.min(Math.max(note.y, box.minY), box.maxY),
  };
}

/** 두 개의 [0,1) 난수로 0~1 사이 값을 만들되 0쪽(가까운 쪽)이 더 자주 나오게 한다 — 바깥으로 갈수록 성기게. */
export function centerBiased(u1: number, u2: number): number {
  // 두 균등값의 곱은 0쪽으로 몰린다(밀도 -ln x). 너무 한가운데에만 몰리지 않게 균등값과 반씩 섞는다.
  return 0.5 * u1 * u2 + 0.5 * u1 * u1;
}

/** 안쪽 비율(예: 0.7 → world 가운데 70%)에 해당하는 top-left 범위 — 샘플을 가장자리 쪽으로 퍼뜨리지 않기 위해. */
export function centralBounds(ratio: number, { width = POST_IT_WIDTH, height = POST_IT_HEIGHT, worldW = WORLD_W, worldH = WORLD_H } = {}): NoteBox {
  const padX = (worldW * (1 - ratio)) / 2;
  const padY = (worldH * (1 - ratio)) / 2;
  return { minX: padX, minY: padY, maxX: worldW - padX - width, maxY: worldH - padY - height };
}
