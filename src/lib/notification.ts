/**
 * 자신의 포스트잇에 스스로 공감/댓글을 남긴 경우엔 알림을 만들지 않는다는 규칙의 순수 판정 함수.
 * 공감/댓글 라우트 양쪽에서 재사용해 규칙이 갈라지지 않게 한다.
 */
export function shouldNotify(receiverId: string, senderId: string): boolean {
  return receiverId !== senderId;
}
