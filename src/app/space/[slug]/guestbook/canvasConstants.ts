/* ── 방명록 캔버스 공용 상수/타입 ──────────────────────────── */

import { POST_IT_WIDTH } from "@/lib/postitCollision";

// 정사각형 + 대폭 확장 — 상하좌우 어느 방향으로도 동일하게 자유로운 팬
export const WORLD_W = 5000;
export const WORLD_H = 5000;
export const NOTE_W = POST_IT_WIDTH; // 충돌 판정과 같은 값을 써야 하므로 postitCollision.ts를 단일 출처로 재사용
export const POSTIT_COLOR = "#F6E7A8"; // MVP 대표 노란색 (따뜻한 베이지 노랑)

export interface GuestbookNoteData {
  id: string;
  userId?: string;
  content: string;
  nickname?: string | null;
  imageUrl?: string | null;
  x: number;
  y: number;
  rotation: number;
  color: string;
  createdAt: string; // YYYY.MM.DD
  /** 내 직전 방문 이후 생긴 흔적인지 */
  isNew?: boolean;
  /** 공감 수 */
  reactionCount?: number;
  /** 로그인한 내가 이미 공감했는지 */
  reactedByMe?: boolean;
  /** 댓글 수 */
  commentCount?: number;
}
