import { requireAdminPage } from "@/lib/adminGuard";
import { EMPTY_OPS_INITIAL, getSpaceOptions, nextThoughtNumber } from "@/lib/editorial/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialDocForm from "@/components/admin/editorial/EditorialDocForm";

export default async function NewThoughtPage() {
  await requireAdminPage();
  const [spaceOptions, number] = await Promise.all([getSpaceOptions(), nextThoughtNumber()]);
  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "생각", href: "/admin/content/thoughts" }]}
        title="새 THOUGHT"
        description="초안으로 저장되며, 발행해야 공개 페이지에 나옵니다."
      />
      <EditorialDocForm
        kind="thoughts"
        spaceOptions={spaceOptions}
        initial={{ ...EMPTY_OPS_INITIAL, number: String(number), slug: "", label: "", title: "", summary: "", coverImage: null, coverPosition: null, spaces: [], blocks: [] }}
      />
    </>
  );
}
