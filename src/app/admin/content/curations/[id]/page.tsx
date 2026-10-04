import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { getAreaOptions, getSpaceOptions, opsInitial, storedBlocks } from "@/lib/editorial/admin";
import { assigneeSuggestions } from "@/lib/editorial/pipelineDb";
import { effectiveStage } from "@/lib/editorial/pipeline";
import { curationLabel } from "@/lib/editorial/types";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialDocForm from "@/components/admin/editorial/EditorialDocForm";
import { EditorialDangerZone } from "@/components/admin/editorial/EditorialControls";

export default async function EditCurationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [c, spaceOptions, areaOptions, assigneeOptions] = await Promise.all([
    prisma.editorialCuration.findUnique({ where: { id }, include: { spaces: { orderBy: { order: "asc" } } } }),
    getSpaceOptions(),
    getAreaOptions(),
    assigneeSuggestions(),
  ]);
  if (!c) notFound();

  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "큐레이션", href: "/admin/content/curations" }, { label: curationLabel({ number: c.number, area: c.area }) }]}
        title={c.title}
        description={`/curation/${c.slug}`}
      />
      <div className="space-y-10">
        <EditorialDocForm
          kind="curations"
          id={c.id}
          status={c.status}
          spaceOptions={spaceOptions}
          stage={effectiveStage(c.stage, c.status)}
          areaOptions={areaOptions}
          assigneeOptions={assigneeOptions}
          initial={{
            ...opsInitial(c),
            number: String(c.number), slug: c.slug, label: c.area ?? "", perspective: c.perspective ?? "", title: c.title, summary: c.summary,
            coverImage: c.coverImage, coverPosition: c.coverPosition,
            spaces: c.spaces.map((l) => ({ spaceId: l.spaceId, note: l.note ?? "" })),
            blocks: storedBlocks(c.blocks),
          }}
        />
        <div className="max-w-3xl"><EditorialDangerZone kind="curations" id={c.id} status={c.status} name={c.title} /></div>
      </div>
    </>
  );
}
