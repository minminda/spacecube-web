import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { getSpaceOptions, storedBlocks } from "@/lib/editorial/admin";
import { formatPeopleNumber } from "@/lib/editorial/types";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialDocForm from "@/components/admin/editorial/EditorialDocForm";
import { EditorialDangerZone } from "@/components/admin/editorial/EditorialControls";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [p, spaceOptions] = await Promise.all([
    prisma.editorialPerson.findUnique({ where: { id }, include: { spaces: { orderBy: { order: "asc" } } } }),
    getSpaceOptions(),
  ]);
  if (!p) notFound();

  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "피플", href: "/admin/content/people" }, { label: formatPeopleNumber(p.number) }]}
        title={p.title}
        description={`/people/${p.slug}`}
      />
      <div className="space-y-10">
        <EditorialDocForm
          kind="people"
          id={p.id}
          status={p.status}
          spaceOptions={spaceOptions}
          initial={{
            number: String(p.number), slug: p.slug, label: p.subject ?? "", title: p.title, summary: p.summary,
            coverImage: p.coverImage, coverPosition: p.coverPosition,
            spaces: p.spaces.map((l) => ({ spaceId: l.spaceId, note: l.note ?? "" })),
            blocks: storedBlocks(p.blocks),
          }}
        />
        <div className="max-w-3xl"><EditorialDangerZone kind="people" id={p.id} status={p.status} name={p.title} /></div>
      </div>
    </>
  );
}
