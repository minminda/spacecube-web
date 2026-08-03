import { describe, it, expect } from "vitest";
import {
  validateEpisodeTemplateTitle,
  validateEpisodeTemplateDescription,
  validateSceneTopicTitle,
  validateSceneTopicDescription,
  validateQuestionContent,
  isDuplicateQuestion,
  INTERVIEW_EPISODE_TITLE_MAX,
  INTERVIEW_SCENE_TOPIC_TITLE_MAX,
  INTERVIEW_QUESTION_MAX,
} from "./interviewInput";

describe("validateEpisodeTemplateTitle", () => {
  it("빈 제목을 거부한다", () => {
    expect(validateEpisodeTemplateTitle("")).toEqual({ ok: false, error: "에피소드 제목을 입력해주세요." });
  });

  it("공백만 있는 제목을 거부한다", () => {
    expect(validateEpisodeTemplateTitle("   ")).toEqual({ ok: false, error: "에피소드 제목을 입력해주세요." });
  });

  it("최대 길이를 넘으면 거부한다", () => {
    const tooLong = "가".repeat(INTERVIEW_EPISODE_TITLE_MAX + 1);
    expect(validateEpisodeTemplateTitle(tooLong).ok).toBe(false);
  });

  it("정상 제목은 통과한다", () => {
    expect(validateEpisodeTemplateTitle("첫 만남")).toEqual({ ok: true });
  });
});

describe("validateEpisodeTemplateDescription", () => {
  it("빈 설명은 통과한다(선택 항목)", () => {
    expect(validateEpisodeTemplateDescription("")).toEqual({ ok: true });
  });

  it("최대 길이를 넘으면 거부한다", () => {
    const tooLong = "가".repeat(501);
    expect(validateEpisodeTemplateDescription(tooLong).ok).toBe(false);
  });
});

describe("validateSceneTopicTitle", () => {
  it("빈 소재명을 거부한다", () => {
    expect(validateSceneTopicTitle("")).toEqual({ ok: false, error: "소재명을 입력해주세요." });
  });

  it("최대 길이를 넘으면 거부한다", () => {
    const tooLong = "가".repeat(INTERVIEW_SCENE_TOPIC_TITLE_MAX + 1);
    expect(validateSceneTopicTitle(tooLong).ok).toBe(false);
  });

  it("정상 소재명은 통과한다", () => {
    expect(validateSceneTopicTitle("공간이 시작되기 전")).toEqual({ ok: true });
  });
});

describe("validateSceneTopicDescription", () => {
  it("빈 설명은 통과한다(선택 항목)", () => {
    expect(validateSceneTopicDescription("")).toEqual({ ok: true });
  });

  it("최대 길이를 넘으면 거부한다", () => {
    const tooLong = "가".repeat(301);
    expect(validateSceneTopicDescription(tooLong).ok).toBe(false);
  });
});

describe("validateQuestionContent", () => {
  it("빈 질문을 거부한다", () => {
    expect(validateQuestionContent("")).toEqual({ ok: false, error: "질문을 입력해주세요." });
  });

  it("최대 길이를 넘으면 거부한다", () => {
    const tooLong = "가".repeat(INTERVIEW_QUESTION_MAX + 1);
    expect(validateQuestionContent(tooLong).ok).toBe(false);
  });

  it("정상 질문은 통과한다", () => {
    expect(validateQuestionContent("왜 이 공간을 만들기로 했나요?")).toEqual({ ok: true });
  });
});

describe("isDuplicateQuestion", () => {
  it("trim 후 완전히 같은 질문이 있으면 중복으로 판단한다", () => {
    expect(isDuplicateQuestion("  왜 시작했나요?  ", ["왜 시작했나요?"])).toBe(true);
  });

  it("다른 질문이면 중복이 아니다", () => {
    expect(isDuplicateQuestion("왜 시작했나요?", ["언제 시작했나요?"])).toBe(false);
  });

  it("excludeContent로 넘긴 항목은 스스로와 비교하지 않는다(수정 시 자기 자신 제외)", () => {
    expect(isDuplicateQuestion("왜 시작했나요?", ["왜 시작했나요?"], "왜 시작했나요?")).toBe(false);
  });
});
