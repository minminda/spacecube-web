import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader } from "@/components/admin/ui";
import { getRegionSuggestions, getTagGroups, getTypeSuggestions } from "@/lib/editorial/admin";
import EditorialSpaceForm, { EMPTY_SPACE } from "@/components/admin/editorial/EditorialSpaceForm";

export default async function NewEditorialSpacePage() {
  await requireAdminPage();
  const [tagGroups, regionSuggestions, typeSuggestions] = await Promise.all([getTagGroups(), getRegionSuggestions(), getTypeSuggestions()]);
  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "공간 등록", href: "/admin/content/spaces" }]}
        title="새 공간 등록"
        description="초안으로 저장"
      />
      <EditorialSpaceForm initial={EMPTY_SPACE} tagGroups={tagGroups} regionSuggestions={regionSuggestions} typeSuggestions={typeSuggestions} />
    </>
  );
}
