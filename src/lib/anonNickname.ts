/** 비로그인 방명록 작성자에게 붙이는 고정 닉네임 — 로그인 사용자의 닉네임 설정/유일성 정책과
 * 완전히 분리된 단순 표시용 문자열이다(GuestbookNote.nickname은 원래도 User.nickname을 그대로
 * 복사해두는 비정규화 필드일 뿐이라 새 컬럼/유일성 제약이 필요 없다). */
export const ANONYMOUS_NICKNAME = "익명의 방문자";
