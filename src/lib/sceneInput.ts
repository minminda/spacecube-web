export interface SceneValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Scene "저장"(수정) 시점의 최소 검증 — 제목·본문은 필수, 공백만 있는 값은 금지.
 * 한 줄 요약(summary)은 계속 선택값이라 검증하지 않는다.
 * 관리자 클라이언트(SceneManager)와 서버(api/scenes/[sceneId])가 이 함수를 공유한다 —
 * Scene "생성"(POST, 빈 Scene 껍데기를 먼저 만드는 흐름)에는 적용하지 않는다.
 */
export function validateSceneFields(title: string, content: string): SceneValidationResult {
  if (!title.trim()) return { ok: false, error: "제목을 입력해주세요." };
  if (!content.trim()) return { ok: false, error: "본문을 입력해주세요." };
  return { ok: true };
}
