export interface QuestionnaireQuestion {
  id: string;
  content: string;
  isActive: boolean;
}

export interface QuestionnaireSceneTopic {
  id: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireEpisodeTemplate {
  episodeNumber: number;
  title: string;
  description: string | null;
  sceneTopics: QuestionnaireSceneTopic[];
}

/** Scene 소재별로 선택된 질문 id 목록 (순서 유지) — 질문지 미리보기/텍스트 생성에 그대로 쓰인다. */
export interface SceneTopicSelection {
  sceneTopicId: string;
  questionIds: string[];
}

/**
 * 질문 배열에서 하나를 무작위로 고른다 — 비활성 질문은 후보에서 제외하고,
 * excludeIds로 넘긴 질문들(직전 뽑기 결과·이미 선택된 질문)도 가능하면 피한다.
 * 후보가 전부 걸러지면(활성 질문이 1개뿐인 경우 등) excludeIds를 무시하고 활성 질문 중에서 뽑는다.
 */
export function pickRandomQuestion(
  questions: QuestionnaireQuestion[],
  excludeIds: string[] = []
): QuestionnaireQuestion | null {
  const active = questions.filter((q) => q.isActive);
  if (active.length === 0) return null;
  const pool = active.filter((q) => !excludeIds.includes(q.id));
  const candidates = pool.length > 0 ? pool : active;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 질문지 마지막에 항상 붙는 자유 응답 안내 — 에피소드마다 달라질 이유가 없는 고정 문구라
 * 별도 DB 필드로 만들지 않고 여기 상수로만 관리한다.
 */
export const QUESTIONNAIRE_CLOSING_NOTE =
  "위 질문 외에도 꼭 남기고 싶은 이야기가 있다면 자유롭게 작성해주세요.\n\n" +
  "작성해주신 답변은 공간큐브에서 이야기 형태로 편집한 뒤, 게시 전에 반드시 확인을 요청드립니다.";

/**
 * Google Docs에 붙여넣기 좋은 평문 질문지를 만든다. Scene 소재 순서는 에피소드 템플릿의
 * displayOrder를 그대로 따르고, 선택된 질문이 없는 소재는 건너뛴다(필수 여부와 무관하게
 * 출력 시점엔 선택된 것만 반영 — 필수 검증은 화면 쪽에서 미리보기 진입 전에 처리한다).
 */
export function buildQuestionnaireText(
  spaceName: string,
  template: QuestionnaireEpisodeTemplate,
  selections: SceneTopicSelection[]
): string {
  const lines: string[] = [];

  lines.push(`[${spaceName}] EP.${template.episodeNumber} '${template.title}' 제작 질문지`);
  lines.push("");
  lines.push(`EP.${template.episodeNumber} 소개`);
  if (template.description) lines.push(template.description);
  lines.push("");

  let displayIndex = 1;
  for (const sceneTopic of template.sceneTopics) {
    const selection = selections.find((s) => s.sceneTopicId === sceneTopic.id);
    const questionIds = selection?.questionIds ?? [];
    if (questionIds.length === 0) continue;

    lines.push(`${displayIndex}. ${sceneTopic.title}`);
    lines.push("");
    for (const questionId of questionIds) {
      const question = sceneTopic.questions.find((q) => q.id === questionId);
      if (!question) continue;
      lines.push(question.content);
      lines.push("");
      lines.push("답변:");
      lines.push("");
      lines.push("");
    }
    displayIndex++;
  }

  lines.push(QUESTIONNAIRE_CLOSING_NOTE);

  return lines.join("\n");
}
