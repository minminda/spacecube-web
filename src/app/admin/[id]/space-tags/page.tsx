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
  const [space, links] = await Promise.all([
    prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true } }),
    prisma.spaceTag.findMany({
      where: { spaceId },
      include: { tag: { include: { categoryRef: true } } },
    }),
  ]);
  if (!space) notFound();

  // "어떤 태그를 붙일지"는 공간 수정 화면(SpaceForm)이 담당한다 — 여기서는 이미 연결된
  // 태그의 가중치·주요태그·노출여부만 조정한다. 카테고리 순서를 그대로 유지하기 위해
  // categoryRef.displayOrder로 정렬한다(미분류는 맨 뒤).
  const grouped = new Map<string, { categoryName: string; rows: { tagId: string; name: string; weight: number; isPrimary: boolean; visibleToUsers: boolean }[] }>();
  const sortedLinks = [...links].sort((a, b) => {
    const ao = a.tag.categoryRef?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.tag.categoryRef?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
  for (const link of sortedLinks) {
    const key = link.tag.categoryRef?.id ?? "__unclassified__";
    const categoryName = link.tag.categoryRef?.name ?? "미분류";
    if (!grouped.has(key)) grouped.set(key, { categoryName, rows: [] });
    grouped.get(key)!.rows.push({
      tagId: link.tagId,
      name: link.tag.name,
      weight: link.weight,
      isPrimary: link.isPrimary,
      visibleToUsers: link.visibleToUsers,
    });
  }

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / SPACE TAGS</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간별 태그 가중치</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      <Link
        href={`/admin/${space.id}/edit`}
        className="block text-xs py-2.5 px-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
        태그 자체를 추가/제거하려면 공간 수정에서 →
      </Link>

      <SpaceTagManager spaceId={space.id} groups={[...grouped.values()]} />
    </main>
  );
}
