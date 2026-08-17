/* ── KPI 집계에서 관리자 행동을 제외하기 위한 공통 자원 ──────────────────
   관리자는 콘텐츠 등록/검수 중 공간 페이지·Episode·방명록·추천 화면을 반복해서 열어보는데,
   이 열람/테스트 행동이 실제 방문자 KPI(파일럿 지표)에 섞이면 안 된다. 새 권한 체계나
   이메일 하드코딩을 추가하지 않고 기존 isAdmin()/ADMIN_EMAIL을 그대로 재사용한다 —
   관리자 계정이 추가/변경돼도 이 파일은 손댈 필요가 없다.
──────────────────────────────────────────────────────────────────── */
import { prisma } from "@/lib/prisma";
import { getAdminEmails } from "@/lib/admin";

/**
 * 관리자 계정의 User.id 집합을 반환한다. Record/GuestbookNote/GuestbookReaction 등은
 * email이 아니라 userId만 들고 있으므로, KPI 집계 쿼리들은 이 결과로 `userId: { notIn: [...] }`
 * 필터를 건다. ADMIN_EMAIL이 비어 있으면(관리자 미설정) 빈 Set을 반환 — 필터가 사실상 no-op이 되어
 * 일반 사용자 집계에는 전혀 영향을 주지 않는다.
 */
export async function getAdminUserIds(): Promise<Set<string>> {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return new Set();
  const admins = await prisma.user.findMany({
    where: { email: { in: adminEmails } },
    select: { id: true },
  });
  return new Set(admins.map((u) => u.id));
}
