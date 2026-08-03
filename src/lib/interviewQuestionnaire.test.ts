import { describe, it, expect } from "vitest";
import {
  pickRandomQuestion,
  buildQuestionnaireText,
  QUESTIONNAIRE_CLOSING_NOTE,
  type QuestionnaireQuestion,
  type QuestionnaireEpisodeTemplate,
} from "./interviewQuestionnaire";

describe("pickRandomQuestion", () => {
  it("질문이 없으면 null을 반환한다", () => {
    expect(pickRandomQuestion([])).toBeNull();
  });

  it("활성 질문이 하나도 없으면 null을 반환한다", () => {
    const questions: QuestionnaireQuestion[] = [{ id: "a", content: "a", isActive: false }];
    expect(pickRandomQuestion(questions)).toBeNull();
  });

  it("비활성 질문은 후보에서 제외한다", () => {
    const questions: QuestionnaireQuestion[] = [
      { id: "a", content: "a", isActive: false },
      { id: "b", content: "b", isActive: true },
    ];
    for (let i = 0; i < 10; i++) {
      expect(pickRandomQuestion(questions)?.id).toBe("b");
    }
  });

  it("excludeIds에 넘긴 질문은 다른 활성 후보가 있으면 피한다", () => {
    const questions: QuestionnaireQuestion[] = [
      { id: "a", content: "a", isActive: true },
      { id: "b", content: "b", isActive: true },
    ];
    for (let i = 0; i < 20; i++) {
      expect(pickRandomQuestion(questions, ["a"])?.id).toBe("b");
    }
  });

  it("제외 후 후보가 하나도 안 남으면 제외를 무시하고 활성 질문 중에서 뽑는다", () => {
    const questions: QuestionnaireQuestion[] = [{ id: "a", content: "a", isActive: true }];
    expect(pickRandomQuestion(questions, ["a"])?.id).toBe("a");
  });
});

describe("buildQuestionnaireText", () => {
  const template: QuestionnaireEpisodeTemplate = {
    episodeNumber: 1,
    title: "첫 만남",
    description: "방문자가 처음 읽는 이야기입니다.",
    sceneTopics: [
      {
        id: "topic-1",
        title: "공간이 시작되기 전",
        description: "계기와 배경",
        isRequired: true,
        questions: [
          { id: "q1", content: "왜 이 공간을 만들기로 했나요?", isActive: true },
          { id: "q2", content: "처음부터 지금과 같은 모습이었나요?", isActive: true },
        ],
      },
      {
        id: "topic-2",
        title: "공간을 만들며 했던 선택",
        description: null,
        isRequired: false,
        questions: [{ id: "q3", content: "가장 오래 고민했던 결정은 무엇인가요?", isActive: true }],
      },
    ],
  };

  it("공간명·에피소드 번호·제목이 첫 줄에 들어간다", () => {
    const text = buildQuestionnaireText("망원 카페", template, [{ sceneTopicId: "topic-1", questionIds: ["q1"] }]);
    expect(text.startsWith("[망원 카페] EP.1 '첫 만남' 제작 질문지")).toBe(true);
  });

  it("선택된 질문이 없는 소재는 출력에서 건너뛴다", () => {
    const text = buildQuestionnaireText("망원 카페", template, [{ sceneTopicId: "topic-1", questionIds: ["q1"] }]);
    expect(text).not.toContain("공간을 만들며 했던 선택");
  });

  it("선택된 질문과 답변 칸을 포함한다", () => {
    const text = buildQuestionnaireText("망원 카페", template, [{ sceneTopicId: "topic-1", questionIds: ["q1"] }]);
    expect(text).toContain("1. 공간이 시작되기 전");
    expect(text).toContain("왜 이 공간을 만들기로 했나요?");
    expect(text).toContain("답변:");
  });

  it("한 소재에서 여러 질문을 선택하면 모두 포함한다", () => {
    const text = buildQuestionnaireText("망원 카페", template, [{ sceneTopicId: "topic-1", questionIds: ["q1", "q2"] }]);
    expect(text).toContain("왜 이 공간을 만들기로 했나요?");
    expect(text).toContain("처음부터 지금과 같은 모습이었나요?");
  });

  it("건너뛴 소재가 있어도 번호는 실제 출력 순서대로 다시 매겨진다", () => {
    const text = buildQuestionnaireText("망원 카페", template, [
      { sceneTopicId: "topic-2", questionIds: ["q3"] },
    ]);
    expect(text).toContain("1. 공간을 만들며 했던 선택");
  });

  it("마지막에 고정 안내 문구가 항상 포함된다", () => {
    const text = buildQuestionnaireText("망원 카페", template, []);
    expect(text).toContain(QUESTIONNAIRE_CLOSING_NOTE);
  });
});
