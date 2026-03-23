/**
 * ADMIN_EMAIL 환경변수에 등록된 이메일이면 관리자.
 * 여러 명이면 쉼표로 구분: "a@a.com,b@b.com"
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}
