import { describe, it, expect } from "vitest";
import { canWriteToSession, getVisibleClusters } from "./guestbookSession";

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
