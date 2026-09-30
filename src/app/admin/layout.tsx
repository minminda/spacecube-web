import type { Metadata } from "next";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import AdminShell from "@/components/admin/ui/AdminShell";

export const metadata: Metadata = {
  title: "관리자 — 공간큐브",
  robots: { index: false, follow: false },
};

/**
 * 관리자 작업실 레이아웃(사이드바 + 본문). 권한 판정은 기존대로 각 페이지가 직접 한다 —
 * 여기서는 관리자가 아닐 때 셸(메뉴 구조)을 노출하지 않고 페이지만 그대로 렌더해, 페이지의
 * 기존 redirect(/login, /)가 이전과 동일하게 동작하게 한다.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!isAdmin(email)) return <>{children}</>;
  return <AdminShell email={email}>{children}</AdminShell>;
}
