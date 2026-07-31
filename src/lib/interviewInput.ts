export interface InterviewValidationResult {
  ok: boolean;
  error?: string;
}

export const INTERVIEW_TOPIC_TITLE_MAX = 50;
export const INTERVIEW_QUESTION_MAX = 200;
export const INTERVIEW_NOTE_MAX = 2000;
export const EPISODE_SUMMARY_MAX = 120;

/**
 * 인터뷰 주제/질문/메모/에피소드 한 줄 요약 — 관리자 클라이언트(InterviewPrep 등)와
 * 서버(API 라우트)가 이 파일을 공유해 동일한 trim·길이 규칙을 적용한다.
 */
export function validateTopicTitle(title: string): InterviewValidationResult {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "주제명을 입력해주세요." };
  if (trimmed.length > INTERVIEW_TOPIC_TITLE_MAX) {
    return { ok: false, error: `주제명은 ${INTERVIEW_TOPIC_TITLE_MAX}자 이내로 입력해주세요.` };
  }
  return { ok: true };
}

export function validateQuestionContent(content: string): InterviewValidationResult {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "질문을 입력해주세요." };
  if (trimmed.length > INTERVIEW_QUESTION_MAX) {
    return { ok: false, error: `질문은 ${INTERVIEW_QUESTION_MAX}자 이내로 입력해주세요.` };
  }
  return { ok: true };
}

export function validateInterviewNote(note: string): InterviewValidationResult {
  if (note.length > INTERVIEW_NOTE_MAX) {
    return { ok: false, error: `인터뷰 메모는 ${INTERVIEW_NOTE_MAX}자 이내로 입력해주세요.` };
  }
  return { ok: true };
}

export function validateEpisodeSummary(summary: string): InterviewValidationResult {
  if (summary.length > EPISODE_SUMMARY_MAX) {
    return { ok: false, error: `한 줄 요약은 ${EPISODE_SUMMARY_MAX}자 이내로 입력해주세요.` };
  }
  return { ok: true };
}

/** 같은 주제 안에서 동일한 질문(trim 후 완전 일치)이 중복되지 않도록 확인한다. */
export function isDuplicateQuestion(content: string, existing: string[], excludeContent?: string): boolean {
  const trimmed = content.trim();
  return existing.some((c) => c.trim() === trimmed && c.trim() !== (excludeContent ?? "").trim());
}
