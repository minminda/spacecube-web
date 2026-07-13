import type { GuestbookSessionStatus } from "@prisma/client";

/** ACTIVE 세션에만 새 포스트잇을 작성할 수 있다 — 종료(ARCHIVED)되거나 준비 중(DRAFT)인 세션은 읽기 전용. */
export function canWriteToSession(status: GuestbookSessionStatus): boolean {
  return status === "ACTIVE";
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
