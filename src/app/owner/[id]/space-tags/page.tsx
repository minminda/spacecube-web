import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import SpaceTagManager from "./SpaceTagManager";

interface Props { params: Promise<{ id: string }> }

export default async function SpaceTagsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const [space, allTags, links] = await Promise.all([
    prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true } }),
    prisma.tag.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.spaceTag.findMany({ where: { spaceId } }),
  ]);
  if (!space) notFound();

  const linkByTagId = new Map(links.map((l) => [l.tagId, l]));

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / SPACE TAGS</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간별 태그 · 가중치</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      <SpaceTagManager
        spaceId={space.id}
        tags={allTags.map((t) => {
          const link = linkByTagId.get(t.id);
          return {
            tagId: t.id,
            name: t.name,
            category: t.category,
            linked: !!link,
            weight: link?.weight ?? 1,
            isPrimary: link?.isPrimary ?? false,
            visibleToUsers: link?.visibleToUsers ?? true,
          };
        })}
      />
    </main>
  );
}
