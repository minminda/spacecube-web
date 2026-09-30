import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { formatPeopleNumber } from "@/lib/editorial/types";
import DocListPage, { statusCounts } from "@/components/admin/editorial/DocListPage";
import { parseStatusFilter } from "@/components/admin/editorial/StatusTabs";

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

/** CONTENT › 피플 — 공간을 통해 한 사람을 알아가는 홈페이지 콘텐츠(현장 에피소드와 별개). */
export default async function AdminContentPeoplePage({ searchParams }: Props) {
  await requireAdminPage();
  const { q: qRaw, status: statusRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const filter = parseStatusFilter(statusRaw);
  const search: Prisma.EditorialPersonWhereInput = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { subject: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
    : {};

  const [rows, groups] = await Promise.all([
    prisma.editorialPerson.findMany({
      where: { ...search, ...(filter === "ALL" ? {} : { status: filter }) },
      orderBy: { number: "desc" },
      include: { _count: { select: { spaces: true } } },
    }),
    prisma.editorialPerson.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
  ]);

  return (
    <DocListPage
      kind="people"
      title="피플"
      description="공간을 통해 한 사람을 알아가는 홈페이지 콘텐츠입니다. 현장 Cube의 에피소드와는 별개예요."
      newLabel="+ 새 PEOPLE"
      searchPlaceholder="제목, 소개 대상, slug"
      publicBase="/people"
      q={q}
      filter={filter}
      counts={statusCounts(groups)}
      rows={rows.map((p) => ({
        id: p.id, slug: p.slug, numberLabel: formatPeopleNumber(p.number), title: p.title, sub: p.subject,
        spaceCount: p._count.spaces, status: p.status, updatedAt: p.updatedAt,
      }))}
    />
  );
}
