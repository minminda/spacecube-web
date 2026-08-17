/**
 * ADMIN_EMAIL 환경변수에 등록된 이메일이면 관리자.
 * 여러 계정은 쉼표로 구분: "a@a.com,b@b.com,c@c.com"
 *
 * 현재 관리자 계정 (.env 기준):
 *   rkdms93319@gmail.com
 *   202278071c@gmail.com
 *   alsehd0516@gmail.com
 *
 * 관리자는 동시에 일반 사용자 기능(공간 탐색, 기록, 아카이브 등)도 사용 가능.
 */

/** ADMIN_EMAIL을 파싱한 소문자 이메일 목록 — isAdmin()과 kpiEligibility.ts(관리자 userId 조회)가 공유한다. */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
