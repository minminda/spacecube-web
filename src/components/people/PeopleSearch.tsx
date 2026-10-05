"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RecommendedPerson } from "@/lib/people/peopleData";
import { PeopleGrid, PeopleGridSkeleton } from "./PeopleGrid";

/**
 * 추천 > 사람 — 닉네임 검색 칸 하나 + 같은 자리의 그리드.
 * 검색어가 없으면(또는 2자 미만) 서버가 그린 추천(children), 있으면 같은 카드 모양의 검색 결과. 페이지 이동 없음.
 * 검색어는 주소(?who=)에 replace로만 남긴다 — 프로필에 갔다가 뒤로 오면 같은 검색 결과로 돌아온다(기록은 늘리지 않음).
 * 새 결과를 받는 동안 이전 결과를 흐리게 두어 레이아웃이 흔들리지 않게 한다.
 */
export default function PeopleSearch({ initialQuery, initialResults, autoFocus, children }: {
  initialQuery: string;
  /** 주소에 검색어가 있을 때 서버가 미리 찾은 결과 */
  initialResults: RecommendedPerson[] | null;
  autoFocus: boolean;
  /** 추천 그리드(서버 렌더) */
  children: React.ReactNode;
}) {
  // 검색어는 지금 주소(?who=)에서 읽는다 — 뒤로가기로 돌아오면 Next가 검색 전 화면 트리를 복원하므로 prop보다 주소가 정확하다.
  const params = useSearchParams();
  const startQuery = params.get("who") ?? initialQuery;
  const [query, setQuery] = useState(startQuery);
  const [results, setResults] = useState<RecommendedPerson[] | null>(startQuery === initialQuery ? initialResults : null);
  const [loading, setLoading] = useState(false);
  // 결과를 이미 가진 검색어 — 같은 검색어로 다시 요청하지 않는다
  const fetchedFor = useRef<string | null>(startQuery === initialQuery && initialResults ? initialQuery.trim() : null);

  const active = query.trim().replace(/^@/, "").length >= 2;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("who", query.trim());
    else url.searchParams.delete("who");
    url.searchParams.delete("search");
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);

    if (active && fetchedFor.current === query.trim()) return;
    if (!active) {
      fetchedFor.current = null;
      setResults(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/people/search?q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal });
        const data = (await res.json()) as { people?: RecommendedPerson[] };
        fetchedFor.current = query.trim();
        setResults(data.people ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, active]);

  return (
    <>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="pb-5 md:max-w-[360px]">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 30))}
          placeholder="닉네임 검색"
          aria-label="사람 검색"
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          className="w-full h-11 px-3 text-base md:text-sm outline-none"
          style={{ border: "1px solid var(--ed-line)" }}
        />
      </form>
      {active ? (
        <div aria-live="polite" aria-busy={loading} style={{ opacity: loading && results ? 0.5 : 1, transition: "opacity 120ms" }}>
          <p className="ed-label pb-4" style={{ color: "var(--ed-dim)" }}>검색 결과</p>
          {results === null ? (
            <PeopleGridSkeleton count={8} />
          ) : results.length === 0 ? (
            <p className="py-8 text-base font-semibold">검색 결과가 없습니다.</p>
          ) : (
            <PeopleGrid people={results} />
          )}
        </div>
      ) : (
        children
      )}
    </>
  );
}
