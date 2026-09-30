import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader, EmptyState } from "@/components/admin/ui";

/** CONTENT › 미디어 — 홈페이지 콘텐츠용 미디어 관리 기능은 아직 없다(향후 CMS 단계). */
export default async function AdminContentMediaPage() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader area="content" title="미디어" description="홈페이지 콘텐츠에 쓰는 이미지를 모아 관리하는 영역입니다." />
      <EmptyState
        title="미디어 관리 기능 준비 중"
        description="현재 홈페이지 콘텐츠 이미지는 src/content/ 정적 데이터에 URL로 들어갑니다. 운영자에게 보내는 PDF는 Cube Operation › 운영 자료에서 관리합니다."
      />
    </>
  );
}
