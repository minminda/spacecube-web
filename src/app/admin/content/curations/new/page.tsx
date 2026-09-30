import { requireAdminPage } from "@/lib/adminGuard";
import { getSpaceOptions, nextCurationNumber } from "@/lib/editorial/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialDocForm from "@/components/admin/editorial/EditorialDocForm";

export default async function NewCurationPage() {
  await requireAdminPage();
  const [spaceOptions, number] = await Promise.all([getSpaceOptions(), nextCurationNumber()]);
  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "큐레이션", href: "/admin/content/curations" }]}
        title="새 큐레이션"
        description="초안으로 저장되며, 발행해야 공개 페이지에 나옵니다."
      />
      <EditorialDocForm
        kind="curations"
        spaceOptions={spaceOptions}
        initial={{ number: String(number), slug: "", label: "", title: "", summary: "", coverImage: null, coverPosition: null, spaces: [], blocks: [] }}
      />
    </>
  );
}
