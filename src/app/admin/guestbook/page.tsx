import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { AdminPageHeader, AdminTable, EmptyState, StatusBadge, adminButtonClass, formatAdminDate } from "@/components/admin/ui";

/**
 * 방명록 — 운영 공간 선택 화면. 방명록은 운영 공간 단위로만 존재하므로 새 기능 없이 공간별
 * 기존 관리 화면(/admin/[id]/guestbook)으로 연결만 한다(읽기 전용 집계).
 */
export default async function AdminGuestbookIndexPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const spaces = await prisma.space.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, isActive: true,
      guestbookSessions: { where: { status: "ACTIVE" }, select: { question1: true }, take: 1 },
      guestbookNotes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      _count: { select: { guestbookNotes: { where: { deletedAt: null } } } },
    },
  });

  return (
    <>
      <AdminPageHeader
        area="cube"
        title="방명록"
        description=""
      />
      {spaces.length === 0 ? (
        <EmptyState title="운영 공간이 없습니다" />
      ) : (
        <AdminTable head={["운영 공간", "현재 질문", "기록", "최근 기록", ""]} minWidth={720}>
          {spaces.map((s) => (
            <tr key={s.id}>
              <td>
                <Link href={`/admin/${s.id}/guestbook`} className="font-semibold hover:underline underline-offset-4">{s.name}</Link>
                {!s.isActive && <span className="ml-2"><StatusBadge tone="off">비공개</StatusBadge></span>}
              </td>
              <td className="max-w-[320px]">
                {s.guestbookSessions[0]?.question1 ? (
                  <p className="truncate">{s.guestbookSessions[0].question1}</p>
                ) : (
                  <span style={{ color: "var(--a-faint)" }}>진행 중인 질문 없음</span>
                )}
              </td>
              <td className="tabular-nums">{s._count.guestbookNotes}</td>
              <td className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{formatAdminDate(s.guestbookNotes[0]?.createdAt)}</td>
              <td className="text-right">
                <Link href={`/admin/${s.id}/guestbook`} className={adminButtonClass("secondary", "sm")}>관리</Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
