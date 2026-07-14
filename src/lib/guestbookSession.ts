import type { GuestbookSessionStatus } from "@prisma/client";

/** ACTIVE 세션에만 새 포스트잇을 작성할 수 있다 — 종료(ARCHIVED)되거나 준비 중(DRAFT)인 세션은 읽기 전용. */
export function canWriteToSession(status: GuestbookSessionStatus): boolean {
  return status === "ACTIVE";
}

/**
 * "한 번의 방문은 하나의 흔적을 남긴다" — 인정된 방문(Record, isNewVisit 기준) 1회당 포스트잇 1개.
 * hasNoteThisVisit은 (userId, guestbookSessionId, recordId)로 이미 존재하는 노트가 있는지를 뜻한다.
 */
export function canWriteNoteForVisit(status: GuestbookSessionStatus, hasNoteThisVisit: boolean): boolean {
  return canWriteToSession(status) && !hasNoteThisVisit;
}

/**
 * 댓글도 동일하게 방문 단위 — 한 번의 방문 기록으로는 어느 포스트잇에도 댓글을 하나만 남길 수 있다.
 * hasCommentThisVisit은 (guestbookSessionId, userId, recordId)로 이미 존재하는 댓글이 있는지를 뜻한다.
 */
export function canWriteCommentForVisit(status: GuestbookSessionStatus, hasCommentThisVisit: boolean): boolean {
  return canWriteToSession(status) && !hasCommentThisVisit;
}

export type ClusterType = "FREE" | "QUESTION_1" | "QUESTION_2";

export interface VisibleCluster {
  type: ClusterType;
  label: string;
  x: number;
  y: number;
}

export interface SessionClusterFields {
  question1: string | null;
  question2: string | null;
  freeClusterX: number;
  freeClusterY: number;
  question1ClusterX: number;
  question1ClusterY: number;
  question2ClusterX: number;
  question2ClusterY: number;
}

/**
 * 세션에서 실제로 캔버스에 표시할 군집 목록을 만든다. 자유 군집은 항상 포함되고,
 * 질문 1/2는 값이 비어 있으면(null) 배열에서 아예 빠진다 — "질문 없으면 군집 미표시" 규칙.
 */
export function getVisibleClusters(session: SessionClusterFields): VisibleCluster[] {
  const clusters: VisibleCluster[] = [
    { type: "FREE", label: "자유롭게 남겨주세요", x: session.freeClusterX, y: session.freeClusterY },
  ];
  if (session.question1) {
    clusters.push({ type: "QUESTION_1", label: session.question1, x: session.question1ClusterX, y: session.question1ClusterY });
  }
  if (session.question2) {
    clusters.push({ type: "QUESTION_2", label: session.question2, x: session.question2ClusterX, y: session.question2ClusterY });
  }
  return clusters;
}
