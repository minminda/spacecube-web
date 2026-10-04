import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import EditorialPreviewFrame from "@/components/editorial/EditorialPreviewFrame";

export const metadata: Metadata = { title: "미리보기 — 공간큐브", robots: { index: false, follow: false } };

/**
 * 관리자 실시간 미리보기용 빈 페이지 — 관리자 편집 화면의 iframe 안에서만 쓴다.
 * 데이터는 부모 창(관리자 폼)이 postMessage로 넘기는 작성 중 초안뿐이고, DB를 읽거나 쓰지 않는다.
 * 공개 레이아웃(Navbar · 공개 CSS) 그대로 렌더해 실제 독자 화면과 같은 반응형이 적용되게 /admin 밖에 둔다.
 */
export default async function EditorialPreviewPage() {
  const viewer = await getEditorialViewer();
  // 데이터가 없는 빈 틀이라 노출 위험은 없지만 관리자 도구이므로 관리자(또는 로컬 개발)에게만
  if (!viewer.admin && process.env.NODE_ENV !== "development") notFound();
  return <EditorialPreviewFrame />;
}
