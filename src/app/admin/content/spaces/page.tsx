import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader, AdminTable, AdminButtonLink, EmptyState, FilterBar, StatusBadge, adminButtonClass, formatAdminDate } from "@/components/admin/ui";
import { EditorialStatusBadge } from "@/components/admin/editorial/EditorialControls";
import StatusTabs, { parseStatusFilter } from "@/components/admin/editorial/StatusTabs";

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

/**
 * CONTENT › 공간 콘텐츠 — 홈페이지 /spaces에 공개되는 공간(EditorialSpace). 현장 "운영 공간"(DB Space)과 별개.
 */
export default async function AdminContentSpacesPage({ searchParams }: Props) {
  await requireAdminPage();
  const { q: qRaw, status: statusRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const filter = parseStatusFilter(statusRaw);

  // 큐레이터 프로토타입 가상 공간(isDemo)은 공식 공간 콘텐츠 목록에 섞지 않는다 — /admin/curators에서 관리.
  const search: Prisma.EditorialSpaceWhereInput = q
    ? { isDemo: false, OR: [{ name: { contains: q, mode: "insensitive" } }, { area: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
    : { isDemo: false };

  const [rows, groups] = await Promise.all([
    prisma.editorialSpace.findMany({
      where: { ...search, ...(filter === "ALL" ? {} : { status: filter }) },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { curationLinks: true, personLinks: true } } },
    }),
    prisma.editorialSpace.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
  ]);
  const count = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0;
  const counts = { ALL: groups.reduce((n, g) => n + g._count._all, 0), PUBLISHED: count("PUBLISHED"), DRAFT: count("DRAFT"), ARCHIVED: count("ARCHIVED") };

  return (
    <>
      <AdminPageHeader
        area="content"
        title="공간 콘텐츠"
        description="홈페이지에서 공개적으로 소개하고 탐색하는 공간입니다. Cube가 없는 공간도 등록할 수 있으며, 현장 운영 데이터인 '운영 공간'과는 별개예요."
        actions={<AdminButtonLink href="/admin/content/spaces/new" variant="primary">+ 새 공간 콘텐츠</AdminButtonLink>}
      />
      <FilterBar q={q} placeholder="이름, 지역, 종류, slug">
        {filter !== "ALL" && <input type="hidden" name="status" value={filter} />}
      </FilterBar>
      <StatusTabs base="/admin/content/spaces" current={filter} counts={counts} q={q} />

      {rows.length === 0 ? (
        <EmptyState
          title={q || filter !== "ALL" ? "조건에 맞는 공간이 없습니다" : "등록된 공간 콘텐츠가 없습니다"}
          action={<AdminButtonLink href="/admin/content/spaces/new" variant="primary">+ 새 공간 콘텐츠</AdminButtonLink>}
        />
      ) : (
        <AdminTable head={["공간", "지역 · 종류", "Cube", "사용", "상태", "수정일", ""]} minWidth={820}>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>
                <Link href={`/admin/content/spaces/${s.id}`} className="font-semibold hover:underline underline-offset-4">{s.name}</Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--a-faint)" }}>/spaces/{s.slug}</p>
              </td>
              <td>
                <p>{s.area}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--a-dim)" }}>{s.category}</p>
              </td>
              <td>{s.cubeAvailable ? <StatusBadge tone="neutral">설치</StatusBadge> : <span style={{ color: "var(--a-faint)" }}>—</span>}</td>
              <td className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>큐레이션 {s._count.curationLinks} · 피플 {s._count.personLinks}</td>
              <td><EditorialStatusBadge status={s.status} /></td>
              <td className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{formatAdminDate(s.updatedAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <a href={`/spaces/${s.slug}`} target="_blank" rel="noopener noreferrer" className={adminButtonClass("ghost", "sm")}>{s.status === "PUBLISHED" ? "보기 ↗" : "미리보기 ↗"}</a>
                  <Link href={`/admin/content/spaces/${s.id}`} className={adminButtonClass("secondary", "sm")}>편집</Link>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
