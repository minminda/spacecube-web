import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { effectiveStage } from "@/lib/editorial/pipeline";
import { requireAdminPage } from "@/lib/adminGuard";
import { formatThoughtNumber } from "@/lib/editorial/types";
import DocListPage, { statusCounts } from "@/components/admin/editorial/DocListPage";
import { parseStatusFilter } from "@/components/admin/editorial/StatusTabs";

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

/** CONTENT › 생각(THOUGHT) — 실제 장면에서 시작해 하나의 질문·생각으로 넓혀 가는 STORY 콘텐츠(현장 에피소드와 별개). */
export default async function AdminContentThoughtsPage({ searchParams }: Props) {
  await requireAdminPage();
  const { q: qRaw, status: statusRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const filter = parseStatusFilter(statusRaw);
  const search: Prisma.EditorialThoughtWhereInput = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { scene: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
    : {};

  const [rows, groups] = await Promise.all([
    prisma.editorialThought.findMany({
      where: { ...search, ...(filter === "ALL" ? {} : { status: filter }) },
      orderBy: { number: "desc" },
      include: { _count: { select: { spaces: true } } },
    }),
    prisma.editorialThought.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
  ]);

  return (
    <DocListPage
      kind="thoughts"
      title="생각(THOUGHT)"
      description="장면 → 경험 → 질문 → 생각의 순서로 쓰는 STORY 콘텐츠입니다. 현장 Cube의 에피소드와는 별개예요."
      newLabel="+ 새 THOUGHT"
      searchPlaceholder="제목, 시작 장면, slug"
      publicBase="/thought"
      q={q}
      filter={filter}
      counts={statusCounts(groups)}
      rows={rows.map((p) => ({
        id: p.id, slug: p.slug, numberLabel: formatThoughtNumber(p.number), title: p.title, sub: p.scene,
        spaceCount: p._count.spaces, status: p.status, stage: effectiveStage(p.stage, p.status), updatedAt: p.updatedAt,
      }))}
    />
  );
}
