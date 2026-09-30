import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader } from "@/components/admin/ui";
import EditorialSpaceForm, { EMPTY_SPACE } from "@/components/admin/editorial/EditorialSpaceForm";

export default async function NewEditorialSpacePage() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "공간 콘텐츠", href: "/admin/content/spaces" }]}
        title="새 공간 콘텐츠"
        description="홈페이지에 소개할 공간을 등록합니다. 초안으로 저장되며, 발행해야 공개 페이지에 나옵니다."
      />
      <EditorialSpaceForm initial={EMPTY_SPACE} />
    </>
  );
}
