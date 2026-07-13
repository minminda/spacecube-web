/**
 * 공감 가능 여부 순수 판정 함수 — 자신의 글에는 공감할 수 없다는 정책(ALLOW_SELF_GUESTBOOK_REACTION)을
 * 라우트 코드와 분리해 테스트 가능하게 만든다.
 */
export function canReact(postAuthorId: string, userId: string, allowSelfReaction: boolean): boolean {
  if (allowSelfReaction) return true;
  return postAuthorId !== userId;
}
