import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";

/** 신규 관리자 페이지용 권한 확인 — 기존 페이지들과 같은 규칙(비로그인 → /login, 비관리자 → /). */
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");
  return session;
}
