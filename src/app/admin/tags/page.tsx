import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import TagManager from "./TagManager";
import { AdminPageHeader } from "@/components/admin/ui";

export default async function TagsAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const [categories, unclassifiedTags] = await Promise.all([
    prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        tags: {
          orderBy: { displayOrder: "asc" },
          include: { _count: { select: { recordTags: true, spaceLinks: true } } },
        },
      },
    }),
    prisma.tag.findMany({
      where: { categoryId: null },
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { recordTags: true, spaceLinks: true } } },
    }),
  ]);

  const toRow = (t: { id: string; name: string; description: string | null; isActive: boolean; useForRecommendation: boolean; _count: { recordTags: number; spaceLinks: number } }) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    isActive: t.isActive,
    useForRecommendation: t.useForRecommendation,
    usageCount: t._count.recordTags + t._count.spaceLinks,
  });

  const initialCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    selectionType: c.selectionType,
    isActive: c.isActive,
    tags: c.tags.map(toRow),
  }));
  const initialUnclassified = unclassifiedTags.map(toRow);

  const totalTags = initialCategories.reduce((sum, c) => sum + c.tags.length, 0) + initialUnclassified.length;

  return (
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        area="system"
        title="태그 · 카테고리"
        description={`운영 공간의 유형·분위기 태그와 카테고리(전체 태그 ${totalTags}개). 운영 공간 등록 화면과 추천 엔진이 이 분류를 사용합니다.`}
      />

      <TagManager initialCategories={initialCategories} initialUnclassified={initialUnclassified} />
    </main>
  );
}
