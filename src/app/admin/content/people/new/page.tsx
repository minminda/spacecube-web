import { requireAdminPage } from "@/lib/adminGuard";
import { EMPTY_OPS_INITIAL, getSpaceOptions, nextPersonNumber, getPreviewSpaceViews } from "@/lib/editorial/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialDocForm from "@/components/admin/editorial/EditorialDocForm";

export default async function NewPersonPage() {
  await requireAdminPage();
  const [spaceOptions, number, previewSpaces] = await Promise.all([getSpaceOptions(), nextPersonNumber(), getPreviewSpaceViews()]);
  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "피플", href: "/admin/content/people" }]}
        title="새 PEOPLE"
        description="초안으로 저장되며, 발행해야 공개 페이지에 나옵니다."
      />
      <EditorialDocForm
        kind="people"
        spaceOptions={spaceOptions}
        previewSpaces={previewSpaces}
        initial={{ ...EMPTY_OPS_INITIAL, number: String(number), slug: "", label: "", title: "", summary: "", coverImage: null, coverPosition: null, spaces: [], blocks: [] }}
      />
    </>
  );
}
