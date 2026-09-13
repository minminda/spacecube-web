export interface ReactorIdentity {
  userId: string | null;
  anonId: string | null;
}

/**
 * 공감 가능 여부 순수 판정 함수 — 자신의 글에는 공감할 수 없다는 정책(ALLOW_SELF_GUESTBOOK_REACTION)을
 * 라우트 코드와 분리해 테스트 가능하게 만든다. 로그인은 userId, 비로그인은 anonId로 "본인"을
 * 판정한다 — 둘 다 null인 두 익명 신원을 서로 같다고 오판하지 않도록 각 필드가 실제 값일
 * 때만 비교한다.
 */
export function canReact(postAuthor: ReactorIdentity, viewer: ReactorIdentity, allowSelfReaction: boolean): boolean {
  if (allowSelfReaction) return true;
  const sameUser = !!postAuthor.userId && postAuthor.userId === viewer.userId;
  const sameAnon = !!postAuthor.anonId && postAuthor.anonId === viewer.anonId;
  return !(sameUser || sameAnon);
}
