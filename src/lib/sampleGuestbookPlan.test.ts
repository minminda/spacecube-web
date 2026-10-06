import { describe, it, expect } from "vitest";
import { normalizeQuestion, planSampleTopUp, type SessionQuestion } from "./sampleGuestbookPlan";
import { SAMPLE_ANSWERS } from "../../scripts/sample-guestbook-answers";

const BANK = {
  "질문 하나?": ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"],
  "질문 둘?": ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"],
};
const both: SessionQuestion[] = [
  { cluster: "QUESTION_1", question: "질문 하나?", visible: true },
  { cluster: "QUESTION_2", question: "질문 둘?", visible: true },
];

describe("방명록 샘플 보강 계획", () => {
  it("비어 있으면 목표 개수까지 두 질문 칸에 번갈아 채운다(자유 칸에는 만들지 않는다)", () => {
    const plan = planSampleTopUp({ questions: both, existing: [], bank: BANK, target: 6 });
    expect(plan.status).toBe("ok");
    if (plan.status !== "ok") return;
    expect(plan.add).toHaveLength(6);
    expect(plan.add.filter((a) => a.cluster === "QUESTION_1")).toHaveLength(3);
    expect(plan.add.filter((a) => a.cluster === "QUESTION_2")).toHaveLength(3);
    expect(plan.add.every((a) => (a.cluster === "QUESTION_1" ? BANK["질문 하나?"] : BANK["질문 둘?"]).includes(a.content))).toBe(true);
  });

  it("이미 있는 샘플은 유지하고 부족한 만큼만 — 같은 문장은 다시 만들지 않는다", () => {
    const existing = [
      { id: "1", clusterType: "QUESTION_1" as const, content: "a1" },
      { id: "2", clusterType: "QUESTION_1" as const, content: "a2" },
    ];
    const plan = planSampleTopUp({ questions: both, existing, bank: BANK, target: 5 });
    if (plan.status !== "ok") throw new Error("ok여야 함");
    expect(plan.keep.map((n) => n.id)).toEqual(["1", "2"]);
    expect(plan.add).toHaveLength(3);
    expect(plan.add.map((a) => a.content)).not.toContain("a1");
    expect(plan.add.map((a) => a.content)).not.toContain("a2");
  });

  it("다시 실행해도 늘지 않는다(멱등)", () => {
    const first = planSampleTopUp({ questions: both, existing: [], bank: BANK, target: 6 });
    if (first.status !== "ok") throw new Error("ok여야 함");
    const existing = first.add.map((a, i) => ({ id: String(i), clusterType: a.cluster, content: a.content }));
    const second = planSampleTopUp({ questions: both, existing, bank: BANK, target: 6 });
    if (second.status !== "ok") throw new Error("ok여야 함");
    expect(second.add).toHaveLength(0);
    expect(second.keep).toHaveLength(6);
    expect(second.stale).toHaveLength(0);
  });

  it("보이는 질문이 답변 모음에 없으면 만들지 않고 이유를 돌려준다", () => {
    const plan = planSampleTopUp({
      questions: [both[0], { cluster: "QUESTION_2", question: "모르는 질문?", visible: true }],
      existing: [],
      bank: BANK,
      target: 6,
    });
    expect(plan.status).toBe("skip");
    if (plan.status === "skip") expect(plan.reason).toContain("모르는 질문?");
  });

  it("질문 칸이 없거나 숨겨져 있으면 만들지 않는다", () => {
    const plan = planSampleTopUp({
      questions: [
        { cluster: "QUESTION_1", question: null, visible: true },
        { cluster: "QUESTION_2", question: "질문 둘?", visible: false },
      ],
      existing: [],
      bank: BANK,
      target: 6,
    });
    expect(plan.status).toBe("skip");
  });

  it("숨긴 질문은 건너뛰고 보이는 질문 칸만 채운다", () => {
    const plan = planSampleTopUp({
      questions: [both[0], { cluster: "QUESTION_2", question: "모르는 질문?", visible: false }],
      existing: [],
      bank: BANK,
      target: 5,
    });
    if (plan.status !== "ok") throw new Error("ok여야 함");
    expect(plan.add.every((a) => a.cluster === "QUESTION_1")).toBe(true);
    expect(plan.add).toHaveLength(5);
  });

  it("자유 칸 · 바뀐 질문 · 중복 샘플은 정리 대상", () => {
    const existing = [
      { id: "free", clusterType: "FREE" as const, content: "아무 감상" },
      { id: "old", clusterType: "QUESTION_2" as const, content: "예전 질문의 답" },
      { id: "ok", clusterType: "QUESTION_1" as const, content: "a1" },
      { id: "dup", clusterType: "QUESTION_1" as const, content: "a1" },
    ];
    const plan = planSampleTopUp({ questions: both, existing, bank: BANK, target: 4 });
    expect(plan.keep.map((n) => n.id)).toEqual(["ok"]);
    expect(plan.stale.map((n) => n.id).sort()).toEqual(["dup", "free", "old"]);
  });

  it("답이 모자라면 있는 만큼만", () => {
    const plan = planSampleTopUp({ questions: [both[0]], existing: [], bank: { "질문 하나?": ["a1", "a2"] }, target: 10 });
    if (plan.status !== "ok") throw new Error("ok여야 함");
    expect(plan.add).toHaveLength(2);
  });

  it("질문 비교는 앞뒤 · 연속 공백만 무시한다", () => {
    expect(normalizeQuestion("  질문   하나? ")).toBe("질문 하나?");
    const plan = planSampleTopUp({ questions: [{ cluster: "QUESTION_1", question: " 질문  하나?", visible: true }], existing: [], bank: BANK, target: 2 });
    expect(plan.status).toBe("ok");
  });

  it("실제 답변 모음: 질문마다 12개 · 80자 이하 · 중복 없음 · 뻔한 표현 없음", () => {
    for (const [q, answers] of Object.entries(SAMPLE_ANSWERS)) {
      expect(answers.length, q).toBeGreaterThanOrEqual(12);
      expect(new Set(answers).size, q).toBe(answers.length);
      for (const a of answers) {
        expect(a.length, a).toBeLessThanOrEqual(80);
        expect(a, a).not.toMatch(/샘플|SAMPLE|더미|힐링|감성|최고|완벽/i);
      }
    }
  });
});
