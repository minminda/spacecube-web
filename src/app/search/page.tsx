import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import SearchView from "@/components/search/SearchView";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getSavedRegions } from "@/lib/regions/savedRegions";
import { searchForViewer } from "@/lib/search/searchData";
import { HOME_THEMES } from "@/lib/home/shelves";
import { similarPeopleForHome } from "@/lib/people/peopleData";
import { previewDemoUsers } from "@/lib/demoData";

export const metadata: Metadata = { title: "검색 — 공간큐브", description: "지역, 공간, 취향을 직접 찾아보세요.", robots: { index: false } };

interface Props {
  searchParams: Promise<{ q?: string; preview?: string }>;
}

/**
 * 검색 — 내가 지역 · 공간 · 취향을 직접 찾아보는 곳(HOME은 공간큐브가 골라 보여주는 곳).
 * 검색어가 없으면 추천 지역 · 추천 테마, 있으면 공간 · 지역 관련도 순 결과(공간 이름만이 아니라 지역 · 유형 · 태그 · 소개 · 큐레이션 · 설명까지).
 * 주소의 ?q=로 결과를 서버가 먼저 그려 주고, 입력하는 동안은 클라이언트가 /api/search로 갱신한다.
 * 공개 정책은 다른 새 정보구조 화면과 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기).
 */
export default async function SearchPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");
  const q = (sp.q ?? "").slice(0, 40);
  // 임시 공간(fixtures)은 관리자 · 로컬 개발에서만 — 일반 방문자는 ?preview=fixtures를 붙여도 무시된다
  const fixtures = sp.preview === "fixtures" && (viewer.admin || process.env.NODE_ENV === "development");
  const regions = await getSavedRegions(viewer.userId);
  const { corpus, result } = await searchForViewer({ admin: viewer.admin, userId: viewer.userId, q, regions, fixtures });
  // 검색 첫 화면(검색어 없음)의 "취향이 비슷한 사람" — HOME과 같은 기존 로직 재사용. 비로그인 · 후보 없음이면 빈 목록(숨김)
  const similar = !q.trim() && viewer.userId ? await similarPeopleForHome(viewer.userId, { includeDemo: previewDemoUsers(viewer.admin) }) : { people: [] };

  return (
    <div className="editorial-bleed">
      <main className="pb-16 md:pb-28">
        <SearchView
          initialQuery={q}
          initialResult={result}
          areaOptions={corpus.areaOptions}
          themes={HOME_THEMES.map((t) => ({ key: t.key, chip: t.chip }))}
          savedRegions={regions}
          loggedIn={viewer.loggedIn}
          similarPeople={similar.people}
          fixtures={fixtures}
        />
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
