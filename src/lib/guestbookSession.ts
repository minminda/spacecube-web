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
  /** 글자 크기(px) — 관리자가 설정, 기본값은 기존 하드코딩 렌더링과 시각적으로 동일. */
  fontSize: number;
  /** 글자 색상(#RRGGBB) — 관리자가 설정. */
  color: string;
}

export interface SessionClusterFields {
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

/**
 * 세션에서 실제로 캔버스에 표시할 군집 목록을 만든다. 자유 군집은 freeLabelVisible이 true일
 * 때만 포함되고(기존엔 무조건 포함이었음), 질문 1/2는 "내용이 있고 && 표시 설정이 켜져 있을
 * 때"만 포함된다 — 둘 중 하나라도 아니면(내용 비어있음, 또는 관리자가 표시 끔) 군집 자체가
 * 배열에서 빠진다.
 */
export function getVisibleClusters(session: SessionClusterFields): VisibleCluster[] {
  const clusters: VisibleCluster[] = [];
  if (session.freeLabelVisible) {
    clusters.push({
      type: "FREE",
      label: "자유롭게 남겨주세요",
      x: session.freeClusterX,
      y: session.freeClusterY,
      fontSize: session.freeLabelFontSize,
      color: session.freeLabelColor,
    });
  }
  if (session.question1 && session.question1Visible) {
    clusters.push({
      type: "QUESTION_1",
      label: session.question1,
      x: session.question1ClusterX,
      y: session.question1ClusterY,
      fontSize: session.question1FontSize,
      color: session.question1Color,
    });
  }
  if (session.question2 && session.question2Visible) {
    clusters.push({
      type: "QUESTION_2",
      label: session.question2,
      x: session.question2ClusterX,
      y: session.question2ClusterY,
      fontSize: session.question2FontSize,
      color: session.question2Color,
    });
  }
  return clusters;
}
