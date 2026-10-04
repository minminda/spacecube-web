import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader, EmptyState } from "@/components/admin/ui";

/** CONTENT › 미디어 — 홈페이지 콘텐츠용 미디어 관리 기능은 아직 없다(향후 CMS 단계). */
export default async function AdminContentMediaPage() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader area="content" title="미디어" description="" />
      <EmptyState
        title="미디어 관리 기능 준비 중"
        description="이미지는 각 콘텐츠 편집 화면에서 업로드"
      />
    </>
  );
}
