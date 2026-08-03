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

/** Scene 소재 id → 그 소재에서 선택된 질문 id (MVP는 소재당 질문 1개, 없으면 null). */
export type QuestionSelectionMap = Record<string, string | null>;

/**
 * 질문 배열에서 하나를 무작위로 고른다 — 비활성 질문은 후보에서 제외하고,
 * excludeIds로 넘긴 질문들(직전 뽑기 결과)도 가능하면 피한다.
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
 * 인터뷰 시작 도구에서 "선택된 질문 복사" 버튼이 클립보드에 담는 평문을 만든다.
 * 에피소드 번호/제목, Scene 소재 순서·소재명, 선택된 질문만 담고 답변란·공간명·안내문·
 * Google Docs용 서식은 절대 포함하지 않는다 — 관리자가 Google Docs에 붙여넣은 뒤
 * 직접 편집하는 것을 전제로 한 순수 질문 목록이다. 선택되지 않은 Scene 소재는 건너뛴다.
 */
export function buildSelectedQuestionsText(
  template: QuestionnaireEpisodeTemplate,
  selections: QuestionSelectionMap
): string {
  const lines: string[] = [];

  lines.push(`EP.${template.episodeNumber} ${template.title}`);
  lines.push("");

  let displayIndex = 1;
  for (const sceneTopic of template.sceneTopics) {
    const questionId = selections[sceneTopic.id];
    if (!questionId) continue;
    const question = sceneTopic.questions.find((q) => q.id === questionId);
    if (!question) continue;

    lines.push(`${displayIndex}. ${sceneTopic.title}`);
    lines.push(question.content);
    lines.push("");
    displayIndex++;
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  return lines.join("\n");
}
