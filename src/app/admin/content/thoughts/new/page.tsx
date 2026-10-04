import { requireAdminPage } from "@/lib/adminGuard";
import { EMPTY_OPS_INITIAL, getSpaceOptions, nextThoughtNumber, getPreviewSpaceViews } from "@/lib/editorial/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialDocForm from "@/components/admin/editorial/EditorialDocForm";

export default async function NewThoughtPage() {
  await requireAdminPage();
  const [spaceOptions, number, previewSpaces] = await Promise.all([getSpaceOptions(), nextThoughtNumber(), getPreviewSpaceViews()]);
  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "생각", href: "/admin/content/thoughts" }]}
        title="새 THOUGHT"
        description="초안으로 저장"
      />
      <EditorialDocForm
        kind="thoughts"
        spaceOptions={spaceOptions}
        previewSpaces={previewSpaces}
        initial={{ ...EMPTY_OPS_INITIAL, number: String(number), slug: "", label: "", title: "", summary: "", coverImage: null, coverPosition: null, spaces: [], blocks: [] }}
      />
    </>
  );
}
