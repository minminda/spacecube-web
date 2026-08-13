/** 닉네임 변경 쿨다운 — 값만 바꾸면 정책 전체가 바뀐다. */
export const NICKNAME_COOLDOWN_DAYS = 30;

/** 마지막 변경 시각 기준으로 다음 변경이 가능해지는 시각을 계산한다. 한 번도 안 바꿨으면(null) null. */
export function nextNicknameChangeAt(lastChangedAt: Date | null): Date | null {
  if (!lastChangedAt) return null;
  return new Date(lastChangedAt.getTime() + NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

/** 지금 닉네임을 바꿔도 되는지 판정하는 순수 함수 — API/설정 화면이 공유하는 유일한 기준. */
export function canChangeNickname(lastChangedAt: Date | null, now: Date = new Date()): boolean {
  const next = nextNicknameChangeAt(lastChangedAt);
  return !next || now >= next;
}
