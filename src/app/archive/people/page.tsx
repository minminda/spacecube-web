import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import PersonCard from "@/components/profile/PersonCard";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { searchPeople } from "@/lib/profile/profileData";
import { peopleQuery } from "@/lib/profile/publicProfile";

export const metadata: Metadata = { title: "사람 찾기 — 공간큐브", robots: { index: false } };

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * 사람 찾기 — 닉네임·프로필 주소로 공개 프로필을 찾는다. 결과는 사진으로(최근 공개 공간 2~3장) + 취향 따라가기.
 * 검색어 없이 사람을 늘어놓지 않는다(인기 사용자·추천 사용자 목록 없음). 공개 프로필만 검색된다.
 */
export default async function PeopleSearchPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.userId) redirect("/login?callbackUrl=%2Farchive%2Fpeople");
  if (!viewer.editorial) notFound();
  const q = peopleQuery(sp.q);
  const result = q ? await searchPeople(q, viewer.userId) : null;
  const returnTo = q ? `/archive/people?q=${encodeURIComponent(q)}` : "/archive/people";

  return (
    <div className="editorial-bleed">
      <main className="pb-24 md:pb-32">
        <div className="ed-container pt-5 md:pt-8">
          <Link href="/archive" className="inline-flex items-center min-h-10 text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← 내 아카이브</Link>
        </div>
        <PageHeader label="People" title="사람 찾기" description="공개 프로필만 검색돼요.">
          <form method="get" action="/archive/people" role="search" className="pt-6 flex gap-2 max-w-[520px]">
            <input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="닉네임 검색" aria-label="닉네임 또는 @주소로 사람 찾기" autoComplete="off" className="flex-1 min-w-0 h-12 px-4 text-base outline-none" style={{ border: "1px solid var(--ed-fg)" }} />
            <button type="submit" className="ed-btn ed-btn-primary shrink-0">찾기</button>
          </form>
        </PageHeader>

        <section className="ed-container" style={{ borderTop: "1px solid var(--ed-fg)" }}>
          {!result ? (
            <p className="py-10 text-sm" style={{ color: "var(--ed-dim)" }}>
              {sp.q && !q ? <>두 글자 이상 입력해주세요. </> : null}
              <Link href="/archive/following" className="underline underline-offset-4">따라가는 취향 보기</Link>
            </p>
          ) : result.people.length === 0 ? (
            <p className="py-10 text-sm" style={{ color: "var(--ed-dim)" }}>“{q}”에 맞는 공개 프로필이 없어요.</p>
          ) : (
            result.people.map((p) => (
              <PersonCard key={p.handle} p={p} following={result.following.has(p.userId)} loggedIn={viewer.loggedIn} self={p.userId === viewer.userId} returnTo={returnTo} />
            ))
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
