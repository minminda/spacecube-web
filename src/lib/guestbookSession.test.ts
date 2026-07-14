import { describe, it, expect } from "vitest";
import { canWriteToSession, canWriteNoteForVisit, canWriteCommentForVisit, getVisibleClusters } from "./guestbookSession";

describe("canWriteToSession", () => {
  it("ACTIVE 세션에만 작성 가능", () => {
    expect(canWriteToSession("ACTIVE")).toBe(true);
  });
  it("DRAFT 세션에는 작성 불가", () => {
    expect(canWriteToSession("DRAFT")).toBe(false);
  });
  it("ARCHIVED(종료된) 세션에는 작성 불가", () => {
    expect(canWriteToSession("ARCHIVED")).toBe(false);
  });
});

// "한 번의 방문은 하나의 흔적을 남긴다" — 방문 단위(recordId) 작성 제한 시뮬레이션.
// hasNoteThisVisit/hasCommentThisVisit는 실제로는 (userId, sessionId, recordId) 조회 결과지만,
// 재방문 판정(REVISIT_INTERVAL_HOURS, src/lib/visit.ts)이 이미 Record 생성 시점에 적용돼 있으므로
// 여기서는 그 조회 결과만 불리언으로 흉내 낸다.
describe("canWriteNoteForVisit", () => {
  it("첫 방문에서는 포스트잇 1개를 작성할 수 있다", () => {
    expect(canWriteNoteForVisit("ACTIVE", false)).toBe(true);
  });

  it("동일 방문에서 두 번째 포스트잇은 차단한다", () => {
    expect(canWriteNoteForVisit("ACTIVE", true)).toBe(false);
  });

  it("재방문으로 새 방문 기록(recordId)이 생기면 다시 작성할 수 있다", () => {
    // 이전 방문(recordId=A)에서 이미 썼더라도, 재방문으로 새 recordId(B)가 생기면
    // hasNoteThisVisit은 "이번 방문(B) 기준"으로 다시 false가 된다.
    const hasNoteForOldVisit = true;
    const hasNoteForNewVisit = false;
    expect(canWriteNoteForVisit("ACTIVE", hasNoteForOldVisit)).toBe(false);
    expect(canWriteNoteForVisit("ACTIVE", hasNoteForNewVisit)).toBe(true);
  });

  it("ARCHIVED 세션은 이번 방문에 아직 안 썼어도 작성을 차단한다", () => {
    expect(canWriteNoteForVisit("ARCHIVED", false)).toBe(false);
  });

  it("DRAFT 세션도 작성을 차단한다", () => {
    expect(canWriteNoteForVisit("DRAFT", false)).toBe(false);
  });
});

describe("canWriteCommentForVisit", () => {
  it("같은 방문으로는 댓글을 1개만 작성할 수 있다", () => {
    expect(canWriteCommentForVisit("ACTIVE", false)).toBe(true);
    expect(canWriteCommentForVisit("ACTIVE", true)).toBe(false);
  });

  it("재방문 후에는 새 댓글을 작성할 수 있다", () => {
    expect(canWriteCommentForVisit("ACTIVE", false)).toBe(true);
  });

  it("ACTIVE가 아닌 세션은 댓글 작성도 차단한다", () => {
    expect(canWriteCommentForVisit("ARCHIVED", false)).toBe(false);
    expect(canWriteCommentForVisit("DRAFT", false)).toBe(false);
  });
});

const BASE = {
  freeClusterX: 2500,
  freeClusterY: 2500,
  question1ClusterX: 2000,
  question1ClusterY: 2200,
  question2ClusterX: 3000,
  question2ClusterY: 2800,
};

describe("getVisibleClusters", () => {
  it("질문이 둘 다 없으면 자유 군집만 노출", () => {
    const clusters = getVisibleClusters({ ...BASE, question1: null, question2: null });
    expect(clusters).toEqual([{ type: "FREE", label: "자유롭게 남겨주세요", x: 2500, y: 2500 }]);
  });

  it("질문 1만 있으면 자유 + 질문1 군집만 노출", () => {
    const clusters = getVisibleClusters({ ...BASE, question1: "오늘 기억에 남는 순간은?", question2: null });
    expect(clusters.map((c) => c.type)).toEqual(["FREE", "QUESTION_1"]);
  });

  it("질문이 둘 다 있으면 세 군집 모두 노출", () => {
    const clusters = getVisibleClusters({ ...BASE, question1: "질문1", question2: "질문2" });
    expect(clusters.map((c) => c.type)).toEqual(["FREE", "QUESTION_1", "QUESTION_2"]);
    expect(clusters[2]).toEqual({ type: "QUESTION_2", label: "질문2", x: 3000, y: 2800 });
  });
});
