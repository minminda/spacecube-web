import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { getSpaceOptions } from "@/lib/editorial/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialShelfForm from "@/components/admin/home/EditorialShelfForm";

export default async function EditHomeShelfPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [shelf, spaceOptions] = await Promise.all([
    prisma.homeShelf.findUnique({ where: { id }, include: { spaces: { orderBy: { order: "asc" } } } }),
    getSpaceOptions(),
  ]);
  if (!shelf || shelf.kind !== "EDITORIAL") notFound();

  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "HOME 선반", href: "/admin/content/home" }]}
        title={shelf.title ?? "편집 선반"}
        description="EDITORIAL · 운영자가 직접 고른 공간"
      />
      <EditorialShelfForm
        id={shelf.id}
        spaceOptions={spaceOptions}
        initial={{
          title: shelf.title ?? "", description: shelf.description ?? "", visible: shelf.visible,
          spaces: shelf.spaces.map((l) => ({ spaceId: l.spaceId, note: l.note ?? "" })),
        }}
      />
    </>
  );
}
