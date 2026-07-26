import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 방명록 질문/세션 관리는 /admin/[id]/guestbook 통합 페이지로 옮겨졌다 —
 * 외부에서 이 URL로 들어오는 링크가 있을 수 있어 삭제 대신 리다이렉트로 유지한다.
 */
export default async function GuestbookSessionsRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/${id}/guestbook`);
}
