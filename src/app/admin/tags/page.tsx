import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import TagManager from "./TagManager";

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
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / TAGS</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>태그 관리</p>
        <h1 className="text-xl font-bold">전체 태그 {totalTags}개</h1>
      </div>

      <TagManager initialCategories={initialCategories} initialUnclassified={initialUnclassified} />
    </main>
  );
}
