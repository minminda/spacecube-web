"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import HomeSpaceCard from "@/components/home/HomeSpaceCard";
import RegionStar from "@/components/home/RegionStar";
import { ChevronRightIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { homeHref, type AreaOption } from "@/lib/home/shelves";
import type { SearchResponse } from "@/lib/search/searchData";

interface Props {
  initialQuery: string;
  /** 주소에 검색어가 있을 때 서버가 미리 찾은 결과 */
  initialResult: SearchResponse | null;
  areaOptions: AreaOption[];
  themes: { key: string; chip: string }[];
  savedRegions: string[];
  loggedIn: boolean;
}

const RESULT_GRID = "grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5";

/**
 * 검색 화면 — 큰 입력창 하나 + (검색어 없음) 추천 지역 · 추천 테마 / (검색어 있음) 지역 결과 + 공간 결과.
 * 입력하는 동안 0.2초 뒤 결과가 갱신되고, 검색어는 주소(?q=)에 replace로만 남긴다 — 공간 상세에 갔다가 뒤로 오면 같은 결과로 돌아온다.
 * 새 결과를 받는 동안 이전 결과를 흐리게 두어 화면이 흔들리지 않는다. 결과 카드는 HOME의 공간 카드 그대로.
 */
export default function SearchView({ initialQuery, initialResult, areaOptions, themes, savedRegions, loggedIn }: Props) {
  // 검색어는 지금 주소(?q=)에서 읽는다 — 뒤로가기로 돌아오면 Next가 검색 전 화면 트리를 복원하므로 prop보다 주소가 정확하다.
  const params = useSearchParams();
  const startQuery = params.get("q") ?? initialQuery;
  const [query, setQuery] = useState(startQuery);
  const [result, setResult] = useState<SearchResponse | null>(startQuery === initialQuery ? initialResult : null);
  const fetchedFor = useRef<string | null>(startQuery === initialQuery && initialResult ? initialQuery.trim() : null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const active = trimmed.length > 0;
  const shown = active ? result : null;
  const stale = active && !!result && result.q !== trimmed;

  // 데스크톱은 열자마자 입력창에 커서 — 모바일은 키보드가 추천 지역 · 테마를 가리지 않게 눌렀을 때만
  useEffect(() => {
    if (!startQuery && window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);

    if (!active || fetchedFor.current === trimmed) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal });
        const data = (await res.json()) as SearchResponse;
        fetchedFor.current = trimmed;
        setResult({ ...data, q: trimmed });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResult({ q: trimmed, total: 0, regions: [], spaces: [] });
      }
    }, 200);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [trimmed, active]);

  const suggested = areaOptions.filter((o) => o.suggested);
  const others = areaOptions.filter((o) => !o.suggested);
  const empty = active && !!shown && shown.q === trimmed && shown.total === 0 && shown.regions.length === 0;

  return (
    <>
      <div className="ed-wide pt-6 pb-2 md:pt-12">
        <h1 className="sr-only">검색</h1>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            inputRef.current?.blur(); // 모바일 키보드를 내려 결과가 보이게
          }}
          className="relative max-w-[720px]"
        >
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" strokeWidth={1.7} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 40))}
            placeholder="지역, 공간, 취향을 검색해보세요"
            aria-label="지역, 공간, 취향 검색"
            enterKeyHint="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full h-14 pl-12 pr-12 text-base md:text-lg outline-none border focus:border-[var(--ed-fg)] [&::-webkit-search-cancel-button]:hidden"
            style={{ borderColor: "var(--ed-line)", background: "var(--ed-bg)", color: "var(--ed-fg)" }}
          />
          {query && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center"
              style={{ color: "var(--ed-dim)" }}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>

      {active && (
        <section className="ed-wide pt-6" aria-live="polite" aria-busy={stale || !shown}>
          {!shown ? (
            <p className="py-6 text-sm" style={{ color: "var(--ed-dim)" }}>찾는 중...</p>
          ) : (
            <div style={{ opacity: stale ? 0.5 : 1, transition: "opacity 120ms" }}>
              {!empty && shown.total > 0 && (
                <p className="pb-5 text-sm md:text-base font-semibold break-keep">
                  “{shown.q}” 관련 공간 <span className="tabular-nums">{shown.total}</span>곳
                </p>
              )}

              {shown.regions.length > 0 && (
                <section aria-label="지역" className="pb-8">
                  <p className="ed-label pb-2" style={{ color: "var(--ed-dim)" }}>지역</p>
                  <ul style={{ borderTop: "1px solid var(--ed-line)" }}>
                    {shown.regions.map((r) => (
                      <li key={r.area} className="flex items-center" style={{ borderBottom: "1px solid var(--ed-line)" }}>
                        <Link href={homeHref({ area: r.area })} className="group flex-1 min-w-0 flex items-center justify-between gap-3 min-h-16 py-3">
                          <span className="min-w-0">
                            <span className="block text-base md:text-lg font-bold group-hover:underline underline-offset-4">{r.area} 둘러보기</span>
                            <span className="block pt-0.5 text-xs md:text-sm" style={{ color: "var(--ed-dim)" }}>
                              {r.spaceCount > 0 ? `공간 ${r.spaceCount}곳` : "준비 중"}
                              {r.curationCount > 0 ? ` · 큐레이션 ${r.curationCount}편` : ""}
                            </span>
                          </span>
                          <ChevronRightIcon className="w-5 h-5 shrink-0" strokeWidth={1.6} />
                        </Link>
                        <RegionStar area={r.area} initialSaved={r.saved} loggedIn={loggedIn} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {shown.spaces.length > 0 && (
                <ul className={RESULT_GRID}>
                  {shown.spaces.map((s, i) => (
                    <li key={s.space.id} className="min-w-0">
                      <HomeSpaceCard space={s.space} reason={s.reason} save={{ saved: s.saved, loggedIn }} priority={i < 4} />
                    </li>
                  ))}
                </ul>
              )}

              {empty && (
                <div className="py-6">
                  <p className="text-base font-semibold break-keep">“{shown.q}” 관련 공간을 찾지 못했어요.</p>
                  <p className="pt-1 text-sm" style={{ color: "var(--ed-dim)" }}>다른 말로 검색하거나, 아래에서 지역 · 테마를 골라 보세요.</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 검색어가 없거나 결과가 없을 때 — 어디서부터 볼지 막막하지 않게 지역 · 테마 입구 */}
      {(!active || empty) && (
        <>
          <section id="regions" className="ed-wide pt-8 md:pt-12 scroll-mt-[calc(var(--nav-h)+16px)]">
            <h2 className="text-lg md:text-2xl font-bold tracking-[-0.02em]">추천 지역</h2>
            <p className="pt-1 text-xs md:text-sm" style={{ color: "var(--ed-dim)" }}>별표를 누르면 관심 지역으로 저장돼, HOME에서 그 지역의 공간을 먼저 보여드려요.</p>
            <RegionGrid options={suggested} savedRegions={savedRegions} loggedIn={loggedIn} />
            {others.length > 0 && (
              <>
                <p className="ed-label pt-8 pb-3" style={{ color: "var(--ed-dim)" }}>그 밖의 지역</p>
                <RegionGrid options={others} savedRegions={savedRegions} loggedIn={loggedIn} />
              </>
            )}
          </section>

          <section id="themes" className="ed-wide pt-10 md:pt-14 scroll-mt-[calc(var(--nav-h)+16px)]">
            <h2 className="text-lg md:text-2xl font-bold tracking-[-0.02em]">추천 테마</h2>
            <p className="pt-1 text-xs md:text-sm" style={{ color: "var(--ed-dim)" }}>찾고 싶은 경험을 눌러 보세요.</p>
            <ul className="pt-4 flex flex-wrap gap-2">
              {themes.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(t.chip);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center h-11 px-4 text-[15px] border transition-colors hover:bg-[var(--ed-soft)]"
                    style={{ borderColor: "var(--ed-line)" }}
                  >
                    {t.chip}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function RegionGrid({ options, savedRegions, loggedIn }: { options: AreaOption[]; savedRegions: string[]; loggedIn: boolean }) {
  return (
    <ul className="pt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
      {options.map((o) => (
        <li key={o.area} className="flex items-center min-w-0 border" style={{ borderColor: "var(--ed-line)" }}>
          <Link href={homeHref({ area: o.area })} className="flex-1 min-w-0 px-3.5 py-2.5 hover:bg-[var(--ed-soft)] transition-colors">
            <span className="block text-[15px] font-semibold truncate">{o.area}</span>
            <span className="block text-xs truncate" style={{ color: "var(--ed-dim)" }}>{o.spaceCount > 0 ? `공간 ${o.spaceCount}곳` : "준비 중"}</span>
          </Link>
          <RegionStar area={o.area} initialSaved={savedRegions.includes(o.area)} loggedIn={loggedIn} size="sm" className="mr-1" />
        </li>
      ))}
    </ul>
  );
}
