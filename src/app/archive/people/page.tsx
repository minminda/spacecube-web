import { notFound, redirect } from "next/navigation";
import { getEditorialViewer } from "@/lib/editorial/viewer";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * 사람 찾기는 추천 > 사람 탭으로 합쳐졌다(사람 추천 + 닉네임 검색을 한 화면에서).
 * 옛 링크 · 북마크(/archive/people?q=…)는 같은 검색어로 사람 탭에 보낸다. 공개 범위 · 검색 규칙은 그대로(searchPeople).
 */
export default async function PeopleSearchRedirect({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) notFound();
  const q = (sp.q ?? "").trim().slice(0, 30);
  redirect(q ? `/find?tab=people&who=${encodeURIComponent(q)}` : "/find?tab=people&search=1");
}
