import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader } from "@/components/admin/ui";
import { getTagSuggestions } from "@/lib/editorial/admin";
import EditorialSpaceForm, { EMPTY_SPACE } from "@/components/admin/editorial/EditorialSpaceForm";

export default async function NewEditorialSpacePage() {
  await requireAdminPage();
  const tagSuggestions = await getTagSuggestions();
  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "공간 콘텐츠", href: "/admin/content/spaces" }]}
        title="새 공간 콘텐츠"
        description="초안으로 저장"
      />
      <EditorialSpaceForm initial={EMPTY_SPACE} tagSuggestions={tagSuggestions} />
    </>
  );
}
