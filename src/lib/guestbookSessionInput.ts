/* ── 방명록 세션 저장 입력 파싱/검증 (관리자·운영자 공통) ──────────────────
   /api/spaces/[id]/guestbook-sessions/{active,draft}(관리자, isAdmin, 전체 공간)와
   /api/operator/spaces/[spaceId]/guestbook-session(운영자, requireOperatorSpace, 자기
   공간만)가 공유하는 단일 검증 지점 — 두 라우트의 필드 범위는 완전히 동일하고 인가
   게이트만 다르다. 순수 함수(요청 body와 "현재 값"만 받는다, Prisma 직접 호출 없음)라
   유닛 테스트 가능. 항상 성공한다 — 값이 없거나 잘못된 필드는 current(갱신 대상의 현재
   값)로 조용히 폴백하고, 어두운 색상 저장 차단 같은 하드 실패는 두지 않는다(경고는
   폼에서 즉시 보여준다). ── */

import {
  clampFontSize,
  resolveClusterColor,
} from "@/lib/guestbookClusterStyle";

const MAX_QUESTION_LEN = 200;

export interface GuestbookSessionInput {
  question1: string | null;
  question2: string | null;
  freeLabelVisible: boolean;
  question1Visible: boolean;
  question2Visible: boolean;
  freeClusterX: number;
  freeClusterY: number;
  question1ClusterX: number;
  question1ClusterY: number;
  question2ClusterX: number;
  question2ClusterY: number;
  freeLabelFontSize: number;
  question1FontSize: number;
  question2FontSize: number;
  freeLabelColor: string;
  question1Color: string;
  question2Color: string;
}

/** DRAFT를 새로 만들 때(기존 값이 없을 때) 쓰는 기준값 — 스키마 @default와 동일. */
export const DEFAULT_SESSION_FIELDS: GuestbookSessionInput = {
  question1: null,
  question2: null,
  freeLabelVisible: true,
  question1Visible: true,
  question2Visible: true,
  freeClusterX: 2500,
  freeClusterY: 2500,
  question1ClusterX: 2000,
  question1ClusterY: 2200,
  question2ClusterX: 3000,
  question2ClusterY: 2800,
  freeLabelFontSize: 14,
  question1FontSize: 16,
  question2FontSize: 16,
  freeLabelColor: "#8C8C8C",
  question1Color: "#EBEBEB",
  question2Color: "#EBEBEB",
};

function readNumber(body: Record<string, unknown>, key: string, fallback: number): number {
  const v = body[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function readBoolean(body: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = body[key];
  return typeof v === "boolean" ? v : fallback;
}

function readQuestionText(body: Record<string, unknown>, key: string, fallback: string | null): string | null {
  if (!(key in body)) return fallback;
  const v = body[key];
  return typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_QUESTION_LEN) : null;
}

/**
 * body의 필드를 current(갱신 대상의 현재 값, 없으면 DEFAULT_SESSION_FIELDS) 기준으로
 * 파싱/클램프/폴백한다. 항상 성공한다.
 */
export function parseGuestbookSessionInput(
  body: Record<string, unknown>,
  current: GuestbookSessionInput,
): GuestbookSessionInput {
  return {
    question1: readQuestionText(body, "question1", current.question1),
    question2: readQuestionText(body, "question2", current.question2),
    freeLabelVisible: readBoolean(body, "freeLabelVisible", current.freeLabelVisible),
    question1Visible: readBoolean(body, "question1Visible", current.question1Visible),
    question2Visible: readBoolean(body, "question2Visible", current.question2Visible),
    freeClusterX: readNumber(body, "freeClusterX", current.freeClusterX),
    freeClusterY: readNumber(body, "freeClusterY", current.freeClusterY),
    question1ClusterX: readNumber(body, "question1ClusterX", current.question1ClusterX),
    question1ClusterY: readNumber(body, "question1ClusterY", current.question1ClusterY),
    question2ClusterX: readNumber(body, "question2ClusterX", current.question2ClusterX),
    question2ClusterY: readNumber(body, "question2ClusterY", current.question2ClusterY),
    freeLabelFontSize: clampFontSize(body.freeLabelFontSize, current.freeLabelFontSize),
    question1FontSize: clampFontSize(body.question1FontSize, current.question1FontSize),
    question2FontSize: clampFontSize(body.question2FontSize, current.question2FontSize),
    freeLabelColor: resolveClusterColor(body.freeLabelColor, current.freeLabelColor),
    question1Color: resolveClusterColor(body.question1Color, current.question1Color),
    question2Color: resolveClusterColor(body.question2Color, current.question2Color),
  };
}
