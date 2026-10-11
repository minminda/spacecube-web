import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader } from "@/components/admin/ui";
import { getEditorialTagUsers, normTagName } from "@/lib/tagAdmin";
import TagManager, { type CategoryRow, type TagRow } from "./TagManager";

export const dynamic = "force-dynamic";

export default async function TagsAdminPage() {
  await requireAdminPage();

  const tagInclude = {
    _count: { select: { recordTags: true } },
    spaceLinks: { where: { space: { isDemo: false } }, select: { space: { select: { id: true, name: true, slug: true } } } },
  } as const;
  const [categories, unclassifiedTags, editorialUsers] = await Promise.all([
    prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: { tags: { orderBy: { displayOrder: "asc" }, include: tagInclude } },
    }),
    prisma.tag.findMany({ where: { categoryId: null }, orderBy: { displayOrder: "asc" }, include: tagInclude }),
    getEditorialTagUsers(),
  ]);

  // 운영 공간(Cube)과 공간 등록(공개)은 같은 공간이 slug로 겹칠 수 있어 slug 기준으로 한 곳으로 센다.
  const toRow = (t: (typeof unclassifiedTags)[number]): TagRow => {
    const spaces = new Map<string, { name: string; slug: string; where: string }>();
    for (const l of t.spaceLinks) spaces.set(l.space.slug, { name: l.space.name, slug: l.space.slug, where: "운영 공간" });
    for (const e of editorialUsers.get(normTagName(t.name)) ?? []) {
      const prev = spaces.get(e.slug);
      spaces.set(e.slug, { name: e.name, slug: e.slug, where: prev ? "운영 공간 · 공간 등록" : "공간 등록" });
    }
    return {
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      isActive: t.isActive,
      useForRecommendation: t.useForRecommendation,
      recordCount: t._count.recordTags,
      spaces: [...spaces.values()],
    };
  };

  const initialCategories: CategoryRow[] = categories.map((c) => ({
    id: c.id, name: c.name, selectionType: c.selectionType, isActive: c.isActive, tags: c.tags.map(toRow),
  }));
  const initialUnclassified = unclassifiedTags.map(toRow);

  return (
    <main className="flex flex-col gap-6">
      <AdminPageHeader
        area="system"
        title="태그 관리"
        description="공간의 분위기 · 취향 · 이용 상황 · 특징을 나타내는 태그예요. 여기서 만든 태그만 공간 등록에서 고를 수 있고, 검색 · 추천 · HOME 테마가 이 태그를 씁니다."
      />
      <TagManager initialCategories={initialCategories} initialUnclassified={initialUnclassified} />
    </main>
  );
}
