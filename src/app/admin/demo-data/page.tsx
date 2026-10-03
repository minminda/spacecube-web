import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui";
import DemoDataManager from "./DemoDataManager";

/**
 * 시연 데이터 — 발표·시연용 공간과 더미 계정을 지우지 않고 실제 서비스에서만 빼는 스위치.
 * 정책과 필터 정의는 src/lib/demoData.ts 한 곳에 있다. 이 화면은 두 플래그(Space.isDemo,
 * User.isDemo)를 켜고 끄기만 하며, 어떤 데이터도 삭제하지 않는다.
 */
export default async function AdminDemoDataPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const [spaces, demoUsers, inactiveTags] = await Promise.all([
    prisma.space.findMany({
      orderBy: [{ isDemo: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, name: true, slug: true, district: true, isActive: true, isDemo: true,
        cube: { select: { code: true } },
        _count: { select: { records: true, guestbookNotes: true, savedByUsers: true } },
      },
    }),
    prisma.user.findMany({
      where: { isDemo: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, email: true, nickname: true,
        _count: { select: { records: true, guestbookNotes: true, guestbookReactions: true } },
      },
    }),
    prisma.tag.findMany({ where: { isActive: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <AdminPageHeader
        area="system"
        title="시연 데이터"
        description="발표·시연용으로 만든 공간과 더미 계정을 삭제하지 않고 실제 서비스에서만 제외합니다. 언제든 다시 되돌릴 수 있어요."
      />

      <div className="a-card px-4 py-3 mb-8 text-xs leading-relaxed space-y-1" style={{ color: "var(--a-dim)" }}>
        <p><b style={{ color: "var(--a-fg)" }}>시연 공간</b> — QR·직접 링크로는 그대로 열려 시연할 수 있어요. 공개 목록·운영자 검색(이름 정확히 입력 시만 표시)·추천 후보·추천 취향 신호·Overview 합계·자동 리포트에서 빠집니다.</p>
        <p><b style={{ color: "var(--a-fg)" }}>비공개</b>(공개 상태 끔) — QR·직접 링크까지 모두 닫힙니다. 시연 여부와 별개의 스위치예요.</p>
        <p><b style={{ color: "var(--a-fg)" }}>시연 계정</b> — 모든 KPI 집계와 다른 사용자 목록에서 빠지고, 이 계정의 방명록 글은 시연 공간 안에서만 보여요.</p>
        <p>기록·방명록·공감은 별도 스위치 없이 위 두 기준(어느 공간에서, 누가)으로 함께 제외됩니다. 태그는 <Link href="/admin/tags" className="underline underline-offset-4">태그 · 카테고리</Link>의 비활성화를 그대로 씁니다.</p>
      </div>

      <DemoDataManager
        spaces={spaces.map((s) => ({
          id: s.id, name: s.name, slug: s.slug, district: s.district, isActive: s.isActive, isDemo: s.isDemo,
          cubeCode: s.cube?.code ?? null, records: s._count.records, notes: s._count.guestbookNotes, saved: s._count.savedByUsers,
        }))}
        demoUsers={demoUsers.map((u) => ({
          id: u.id, email: u.email, nickname: u.nickname,
          records: u._count.records, notes: u._count.guestbookNotes, reactions: u._count.guestbookReactions,
        }))}
      />

      <AdminSection title="비활성 태그" className="mt-10">
        {inactiveTags.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--a-dim)" }}>비활성화된 태그가 없습니다.</p>
        ) : (
          <p className="text-sm">
            {inactiveTags.map((t) => t.name).join(" · ")}
            <span className="text-xs ml-2" style={{ color: "var(--a-dim)" }}>— 기록 화면·추천 계산에서 제외 중. <Link href="/admin/tags" className="underline underline-offset-4">태그 관리에서 다시 켜기</Link></span>
          </p>
        )}
      </AdminSection>
    </>
  );
}
