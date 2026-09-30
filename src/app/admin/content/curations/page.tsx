import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { curationLabel } from "@/lib/editorial/types";
import DocListPage, { statusCounts } from "@/components/admin/editorial/DocListPage";
import { parseStatusFilter } from "@/components/admin/editorial/StatusTabs";

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

/** CONTENT › 큐레이션 — 공간 콘텐츠를 하나의 관점(주로 지역 × 관점)으로 묶는 홈페이지 콘텐츠. */
export default async function AdminContentCurationsPage({ searchParams }: Props) {
  await requireAdminPage();
  const { q: qRaw, status: statusRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const filter = parseStatusFilter(statusRaw);
  const search: Prisma.EditorialCurationWhereInput = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { area: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
    : {};

  const [rows, groups, home] = await Promise.all([
    prisma.editorialCuration.findMany({
      where: { ...search, ...(filter === "ALL" ? {} : { status: filter }) },
      orderBy: { number: "desc" },
      include: { _count: { select: { spaces: true } } },
    }),
    prisma.editorialCuration.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
    prisma.editorialHomeSettings.findUnique({ where: { id: "home" }, select: { featuredCurationId: true } }),
  ]);

  return (
    <DocListPage
      kind="curations"
      title="큐레이션"
      description="공간 콘텐츠 여러 곳을 하나의 관점으로 묶는 홈페이지 콘텐츠입니다. 주 운영 방식은 '지역 × 하나의 관점'이고, 지역 없는 주제형도 만들 수 있어요."
      newLabel="+ 새 큐레이션"
      searchPlaceholder="제목, 지역, slug"
      publicBase="/curation"
      q={q}
      filter={filter}
      counts={statusCounts(groups)}
      rows={rows.map((c) => ({
        id: c.id, slug: c.slug, numberLabel: curationLabel({ number: c.number, area: c.area }), title: c.title,
        spaceCount: c._count.spaces, status: c.status, updatedAt: c.updatedAt, homeFeatured: home?.featuredCurationId === c.id,
      }))}
    />
  );
}
