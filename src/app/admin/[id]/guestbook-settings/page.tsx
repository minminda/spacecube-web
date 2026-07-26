import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 방명록 화면 설정(배경·레이아웃)은 /admin/[id]/guestbook 통합 페이지의
 * "화면 설정" 탭으로 옮겨졌다 — 외부에서 이 URL로 들어오는 링크가 있을 수
 * 있어 삭제 대신 리다이렉트로 유지한다.
 */
export default async function GuestbookSettingsRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/${id}/guestbook`);
}
