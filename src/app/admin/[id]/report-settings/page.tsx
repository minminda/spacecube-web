import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 리포트 설정 화면은 /admin/[id]/report(운영 리포트 관리) 통합 페이지의 "메일 발송 설정"
 * 섹션으로 옮겨졌다 — 외부에서 이 URL로 들어오는 링크가 있을 수 있어 삭제 대신 리다이렉트로 유지한다.
 */
export default async function ReportSettingsRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/${id}/report`);
}
