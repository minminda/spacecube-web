import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import { AdminPageHeader, AdminTable, AdminButtonLink, EmptyState, FilterBar, StatusBadge, adminButtonClass, formatAdminDate } from "@/components/admin/ui";
import DeleteSpaceButton from "../DeleteSpaceButton";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * 운영 공간 목록 — 기존 /admin 첫 화면의 공간 목록을 옮긴 것(데이터·삭제 로직 동일).
 * "운영 공간" = 실제 GONGGANCUBE가 설치/운영되는 DB Space. 홈페이지 "공간 콘텐츠"와는 별개다.
 */
export default async function AdminSpacesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { q: qRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";

  const spaces = await prisma.space.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { district: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
      cube: { select: { code: true, status: true } },
      episodes: { select: { published: true } },
    },
  });

  return (
    <>
      <AdminPageHeader
        area="cube"
        title="운영 공간"
        description="실제 GONGGANCUBE가 설치되거나 운영되는 공간입니다. 에피소드·방명록·리포트가 이 공간에 연결됩니다. 홈페이지의 '공간 콘텐츠'와는 별개의 데이터예요."
        actions={<AdminButtonLink href="/admin/new" variant="primary">+ 운영 공간 등록</AdminButtonLink>}
      />

      <FilterBar q={q} placeholder="공간 이름, slug, 지역" />

      {spaces.length === 0 ? (
        <EmptyState
          title={q ? "검색 결과가 없습니다" : "등록된 운영 공간이 없습니다"}
          description={q ? "다른 검색어로 찾아보세요." : "첫 운영 공간을 등록하면 큐브를 연결하고 에피소드를 만들 수 있어요."}
        />
      ) : (
        <>
          <p className="text-xs mb-3" style={{ color: "var(--a-dim)" }}>총 {spaces.length}곳</p>
          <AdminTable head={["운영 공간", "지역 · 유형", "큐브", "에피소드", "상태", "등록일", ""]} minWidth={860}>
            {spaces.map((space) => {
              const published = space.episodes.filter((e) => e.published).length;
              return (
                <tr key={space.id}>
                  <td>
                    <Link href={`/admin/${space.id}/edit`} className="font-semibold hover:underline underline-offset-4">{space.name}</Link>
                    <p className="text-xs mt-0.5" style={{ color: "var(--a-faint)" }}>/space/{space.slug}</p>
                  </td>
                  <td>
                    <p>{space.district ?? "—"}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--a-dim)" }}>{resolveSpaceTypeLabel(space.spaceTagLinks, space.type)}</p>
                  </td>
                  <td className="tabular-nums">
                    {space.cube ? (
                      <Link href={`/admin/cubes?code=${encodeURIComponent(space.cube.code)}`} className="hover:underline underline-offset-4">{space.cube.code}</Link>
                    ) : (
                      <span style={{ color: "var(--a-faint)" }}>미배정</span>
                    )}
                  </td>
                  <td className="tabular-nums">
                    <Link href={`/admin/${space.id}/episodes`} className="hover:underline underline-offset-4">
                      {published}<span style={{ color: "var(--a-faint)" }}> / {space.episodes.length}</span>
                    </Link>
                  </td>
                  <td>{space.isActive ? <StatusBadge tone="live">공개</StatusBadge> : <StatusBadge tone="off">비공개</StatusBadge>}</td>
                  <td className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{formatAdminDate(space.createdAt)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/${space.id}/episodes`} className={adminButtonClass("ghost", "sm")}>에피소드</Link>
                      <Link href={`/admin/${space.id}/guestbook`} className={adminButtonClass("ghost", "sm")}>방명록</Link>
                      <Link href={`/admin/${space.id}/report`} className={adminButtonClass("ghost", "sm")}>리포트</Link>
                      <Link href={`/admin/${space.id}/edit`} className={adminButtonClass("secondary", "sm")}>관리</Link>
                      <DeleteSpaceButton spaceId={space.id} spaceName={space.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </>
      )}
    </>
  );
}
