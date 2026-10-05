import { redirect } from "next/navigation";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { recommendRedirectTarget } from "@/lib/finder/recommendRedirect";

interface Props {
  searchParams: Promise<{ area?: string; pa?: string; category?: string }>;
}

/**
 * 예전 추천 페이지 주소 — 추천은 이제 공간 찾기(/find)의 정렬 순서 자체다("나에게 맞는 순").
 * 기존 링크·북마크가 깨지지 않도록 지역을 유지한 채 /find로 보낸다.
 * 새 정보구조를 아직 볼 수 없는 로그인 사용자는 예전처럼 기존 추천 화면(/archive/taste)으로.
 */
export default async function RecommendRedirect({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  redirect(recommendRedirectTarget(viewer, sp));
}
