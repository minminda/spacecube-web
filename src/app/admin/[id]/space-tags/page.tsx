import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import SpaceTagManager from "./SpaceTagManager";
import { AdminPageHeader, adminButtonClass } from "@/components/admin/ui";

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
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        title="태그 가중치"
        description="추천에 쓰이는 이 운영 공간의 태그별 가중치입니다."
        actions={<Link href={`/admin/${space.id}/edit`} className={adminButtonClass("secondary", "sm")}>태그 추가/제거는 정보 탭에서 →</Link>}
      />

      <SpaceTagManager spaceId={space.id} groups={[...grouped.values()]} />
    </main>
  );
}
