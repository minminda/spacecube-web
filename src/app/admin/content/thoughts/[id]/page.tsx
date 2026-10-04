import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { formatEditorialDate } from "@/lib/editorial/types";
import { getPreviewSpaceViews, getSpaceOptions, opsInitial, storedBlocks } from "@/lib/editorial/admin";
import { assigneeSuggestions } from "@/lib/editorial/pipelineDb";
import { effectiveStage } from "@/lib/editorial/pipeline";
import { formatThoughtNumber } from "@/lib/editorial/types";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialDocForm from "@/components/admin/editorial/EditorialDocForm";
import { EditorialDangerZone } from "@/components/admin/editorial/EditorialControls";

export default async function EditThoughtPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [p, spaceOptions, areaOptions, assigneeOptions, previewSpaces] = await Promise.all([
    prisma.editorialThought.findUnique({ where: { id }, include: { spaces: { orderBy: { order: "asc" } } } }),
    getSpaceOptions(),
    Promise.resolve([] as string[]),
    assigneeSuggestions(),
    getPreviewSpaceViews(),
  ]);
  if (!p) notFound();

  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "생각", href: "/admin/content/thoughts" }, { label: formatThoughtNumber(p.number) }]}
        title={p.title}
        description={`/thought/${p.slug}`}
      />
      <div className="space-y-10">
        <EditorialDocForm
          kind="thoughts"
          id={p.id}
          status={p.status}
          spaceOptions={spaceOptions}
          stage={effectiveStage(p.stage, p.status)}
          areaOptions={areaOptions}
          assigneeOptions={assigneeOptions}
          previewSpaces={previewSpaces}
          publishedDate={formatEditorialDate(p.publishedAt)}
          initial={{
            ...opsInitial(p),
            number: String(p.number), slug: p.slug, label: p.scene ?? "", title: p.title, summary: p.summary,
            coverImage: p.coverImage, coverPosition: p.coverPosition,
            spaces: p.spaces.map((l) => ({ spaceId: l.spaceId, note: l.note ?? "" })),
            blocks: storedBlocks(p.blocks),
          }}
        />
        <div className="max-w-3xl"><EditorialDangerZone kind="thoughts" id={p.id} status={p.status} name={p.title} /></div>
      </div>
    </>
  );
}
