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

  const tags = await prisma.tag.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { recordTags: true, spaceLinks: true } } },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / TAGS</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>태그 관리</p>
        <h1 className="text-xl font-bold">전체 태그 {tags.length}개</h1>
      </div>

      <TagManager
        initialTags={tags.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category ?? "",
          description: t.description ?? "",
          isActive: t.isActive,
          useForRecommendation: t.useForRecommendation,
          usageCount: t._count.recordTags + t._count.spaceLinks,
        }))}
      />
    </main>
  );
}
