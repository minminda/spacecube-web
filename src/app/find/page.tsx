import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import PageHeader from "@/components/editorial/PageHeader";
import SpaceCard from "@/components/editorial/SpaceCard";
import SegmentTabs from "@/components/editorial/SegmentTabs";
import { PeopleGrid, PeopleGridSkeleton } from "@/components/people/PeopleGrid";
import PeopleSearch from "@/components/people/PeopleSearch";
import { SPACE_GRID_CLASS } from "@/components/editorial/SpaceTile";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { normalizeArea } from "@/lib/editorial/area";
import { curatorAccess } from "@/lib/curators/access";
import { cardReason, categoryOptions, filterCandidates, finderHref, parseFinderQuery, rankCandidates, type FinderQuery } from "@/lib/finder/spaceFinder";
import FinderFilters from "@/components/finder/FinderFilters";
import { getFinderPool, getFinderViewer } from "@/lib/finder/finderData";
import { previewDemoUsers } from "@/lib/demoData";
import { recommendPeople, searchPeopleTiles } from "@/lib/people/peopleData";

export const metadata: Metadata = { title: "추천 — 공간큐브", description: "지역만 고르면, 지금까지의 공간 경험을 바탕으로 나에게 맞는 공간부터 보여드려요." };

interface Props {
  searchParams: Promise<{ tab?: string; who?: string; search?: string; area?: string; category?: string; q?: string; feel?: string; for?: string; n?: string }>;
}

const PREFERRED_AREAS = ["연남", "망원", "서촌", "성수"];
const PAGE = 30;

const hrefFor = (q: FinderQuery, n?: number) => finderHref(q, n);

/** 사람 탭 주소 — 공간 탭에서 고른 지역 · 카테고리는 그대로 들고 다닌다(사람 추천에는 쓰지 않고, 공간 탭으로 돌아올 때 유지). */
function peopleHref(q: FinderQuery): string {
  const p = new URLSearchParams({ tab: "people" });
  if (q.area) p.set("area", q.area);
  if (q.category) p.set("category", q.category);
  return `/find?${p}`;
}

/**
 * 추천 > 사람 — 나와 비슷한 공간을 고르는 사람(공개 프로필의 일반 사용자, 별도 큐레이터 없음).
 * 카드 → 공개 프로필 → 그 사람이 고른 공간 → 내 아카이브에 저장 / 취향 따라가기. 점수 · 퍼센트는 보여주지 않는다.
 */
async function PeopleResults({ viewerId, admin, loggedIn }: { viewerId: string | null; admin: boolean; loggedIn: boolean }) {
  const people = await recommendPeople(viewerId, { includeDemo: previewDemoUsers(admin) });
  return (
    <>
      {!loggedIn && people.length > 0 && (
        <p className="pb-5 text-xs" style={{ color: "var(--ed-dim)" }}>
          <Link href={`/login?callbackUrl=${encodeURIComponent("/find?tab=people")}`} className="font-semibold underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>로그인</Link>하면 나와 비슷한 사람부터 보여드려요.
        </p>
      )}
      {people.length === 0 ? <p className="py-10 text-base font-semibold">추천할 사람이 없습니다.</p> : <PeopleGrid people={people} />}
    </>
  );
}

/**
 * 추천 — 공간을 찾는 전체 과정. 사용자가 고르는 것은 지역 · 카테고리(각각 접힌 버튼 하나) · 검색어.
 * 지역 Pool → 저장·방문·아카이브·Cube 경험·큐레이터 관계로 쌓인 취향을 자동으로 적용 → 나에게 맞는 순서로 전부 보여준다.
 * 분위기·유형·목적 같은 수동 필터는 이번 단계에서 두지 않는다(태그는 정렬 엔진 안에서 계속 쓰인다).
 *   옛 링크의 feel/for 파라미터는 읽되 적용하지 않는다 — 화면에 없는 조건으로 후보가 줄어들지 않게.
 * 지역 · 카테고리 · 검색은 후보를 줄이기만 한다 — 남은 공간 안에서는 기존 개인화 정렬 그대로(필터 → rankCandidates).
 * 취향 데이터가 없으면 공간큐브 큐레이션·컬렉션에 담긴 정도 → 공개 순서로 보여준다(빈 화면 없음).
 * 화면은 공간 컬렉션처럼: 사진 그리드(휴대폰 2열 · 데스크톱 4열), 카드에는 사진 · 공간명 · 지역 · 이유 한 줄 · 저장만.
 * 공개 정책은 다른 새 정보구조 화면과 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기).
 */
export default async function FindPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");
  const access = curatorAccess(viewer);
  const q: FinderQuery = { ...parseFinderQuery(sp), moods: [], purposes: [] };
  const tabs = [
    { key: "space", label: "공간", href: hrefFor(q) },
    { key: "people", label: "사람", href: peopleHref(q) },
  ];

  // 기본은 공간. 사람 탭 = 닉네임 검색 칸 + 추천 그리드(검색어가 있으면 같은 자리에 검색 결과). 지역 선택 없음.
  if (sp.tab === "people") {
    const who = (sp.who ?? "").slice(0, 30);
    const initialResults = await searchPeopleTiles(who, viewer.userId, { includeDemo: previewDemoUsers(viewer.admin) });
    return (
      <div className="editorial-bleed">
        <main className="pb-20 md:pb-28">
          <PageHeader title="추천">
            <div className="pt-5"><SegmentTabs segments={tabs} active="people" label="추천 종류" /></div>
          </PageHeader>
          <section className="ed-container pt-5" style={{ borderTop: "1px solid var(--ed-line)" }}>
            <PeopleSearch initialQuery={who} initialResults={initialResults} autoFocus={sp.search === "1"}>
              <Suspense fallback={<PeopleGridSkeleton />}>
                <PeopleResults viewerId={viewer.userId} admin={viewer.admin} loggedIn={viewer.loggedIn} />
              </Suspense>
            </PeopleSearch>
          </section>
        </main>
        <SiteFooter admin={viewer.admin} />
      </div>
    );
  }
  const limit = Math.min(Math.max(Number(sp.n) || PAGE, PAGE), 300);

  const [pool, me, savedIds] = await Promise.all([
    getFinderPool(access),
    getFinderViewer(viewer.userId, access),
    getSavedEditorialSpaceIds(viewer.userId),
  ]);

  const areas = [...new Set(pool.map((s) => normalizeArea(s.area)).filter((a): a is string => !!a))].sort((a, b) => {
    const ia = PREFERRED_AREAS.indexOf(a), ib = PREFERRED_AREAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, "ko");
  });
  const categories = categoryOptions(pool);
  const ranked = rankCandidates(filterCandidates(pool, q), me.personalized ? me.profile : null, me.curatorBoost);
  const filtered = !!(q.area || q.category || q.q);
  const shown = ranked.slice(0, limit);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader title="추천">
          <div className="pt-5"><SegmentTabs segments={tabs} active="space" label="추천 종류" /></div>
          <h2 className="pt-5 pb-3 text-sm font-semibold">어디에서 찾고 있나요?</h2>
          <FinderFilters query={{ area: q.area, category: q.category, q: q.q }} areas={areas} categories={categories} />
        </PageHeader>

        <section className="ed-container" aria-live="polite">
          <p className="py-4 text-xs" style={{ borderTop: "1px solid var(--ed-line)", color: "var(--ed-dim)" }}>
            <span style={{ color: "var(--ed-fg)", fontWeight: 600 }}>{[q.area ?? "전체", q.category].filter(Boolean).join(" · ")}</span>
            {q.q && <span> · “{q.q}”</span>}
            <span className="tabular-nums"> · {ranked.length}곳</span>
            <span> · {me.personalized ? "나에게 맞는 순" : "큐레이션에 담긴 곳 먼저"}</span>
            {q.q && <Link href={hrefFor({ ...q, q: "" })} scroll={false} className="ml-2 underline underline-offset-4">검색 지우기</Link>}
          </p>

          {!me.personalized && !viewer.loggedIn && (
            <p className="pb-5 text-xs" style={{ color: "var(--ed-dim)" }}>
              <Link href={`/login?callbackUrl=${encodeURIComponent(hrefFor(q))}`} className="font-semibold underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>로그인</Link>하면 나에게 맞는 순서로 보여드려요.
            </p>
          )}


          {shown.length === 0 ? (
            <p className="py-10 text-base font-semibold">{filtered ? "조건에 맞는 공간이 없습니다." : "공간을 준비하고 있어요."}</p>
          ) : (
            <div className={`${SPACE_GRID_CLASS} pt-2`}>
              {shown.map((r, i) => {
                // 공간 탭은 공간에만 — 이유에 사람(컬렉션 작성자)을 언급하지 않는다
                const reason = cardReason({
                  visited: me.visitedSlugs.has(r.space.view.slug),
                  personalized: me.personalized,
                  matched: r.matched,
                  curationTitle: r.space.curations[0]?.title,
                  collection: null,
                });
                return (
                  <SpaceCard
                    key={r.space.id}
                    space={r.space.view}
                    priority={i < 4}
                    reason={reason}
                    save={{ saved: savedIds.has(r.space.id), loggedIn: viewer.loggedIn }}
                  />
                );
              })}
            </div>
          )}

          {ranked.length > limit && (
            <div className="pt-10 text-center">
              <Link href={hrefFor(q, limit + PAGE)} scroll={false} className="ed-btn ed-btn-sm">
                더 보기 <span className="tabular-nums font-normal" style={{ color: "var(--ed-dim)" }}>{ranked.length - limit}</span>
              </Link>
            </div>
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
