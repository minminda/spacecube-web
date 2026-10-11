"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RegionStar from "@/components/home/RegionStar";
import { ChevronDownIcon, CloseIcon } from "@/components/icons";
import { filterAreaOptions, homeHref, type AreaOption } from "@/lib/home/shelves";

interface Props {
  options: AreaOption[];
  /** 지금 고른 지역(없으면 전체) */
  current: string | null;
  /** HOME 미리보기 파라미터 — 지역을 바꿔도 유지 */
  preview: string | null;
  /** 별표로 저장한 관심 지역(최근 순) */
  savedRegions: string[];
  loggedIn: boolean;
}

/**
 * HOME 지역 선택 — 지도나 필터가 아니라 "오늘 어느 지역의 공간을 볼까?"를 고르는 가벼운 입구.
 * 휴대폰은 아래에서 올라오는 시트, 데스크톱은 가운데 작은 창. 검색 + 관심 지역(별표) + 추천 지역 + 등록된 지역.
 * 지역마다 별표가 있어 바로 관심 지역으로 저장 · 해제할 수 있다 — 저장하면 HOME이 그 지역의 공간을 먼저 보여준다.
 * 고르면 HOME 주소(/?area=후암)가 바뀌고 선반이 그 지역 중심으로 다시 그려진다(스크롤 위치 유지).
 */
export default function RegionPicker({ options, current, preview, savedRegions, loggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open]);

  // 별표한 지역은 목록에 없는 지역(지금은 공간이 없는 곳)이어도 관심 지역 묶음에 보인다
  const known = new Map(options.map((o) => [o.area, o]));
  const savedOptions: AreaOption[] = savedRegions.map((area) => known.get(area) ?? { area, spaceCount: 0, curationCount: 0, suggested: false });
  const savedSet = new Set(savedRegions);

  const shownSaved = filterAreaOptions(savedOptions, query);
  const shown = filterAreaOptions(options, query).filter((o) => !savedSet.has(o.area));
  const suggested = shown.filter((o) => o.suggested);
  const others = shown.filter((o) => !o.suggested);
  const close = () => { setOpen(false); setQuery(""); };

  const item = (o: AreaOption) => {
    const active = o.area === current;
    return (
      <li key={o.area} className="flex items-center" style={{ borderBottom: "1px solid var(--ed-line)" }}>
        <Link
          href={homeHref({ area: o.area, preview })}
          scroll={false}
          onClick={close}
          aria-current={active ? "true" : undefined}
          className="flex-1 min-w-0 flex items-center justify-between min-h-12 px-1 text-[15px]"
          style={{ fontWeight: active ? 700 : 500 }}
        >
          <span className="truncate">{o.area}</span>
          <span className="shrink-0 pl-3 text-xs tabular-nums" style={{ color: "var(--ed-dim)" }}>
            {o.spaceCount > 0 ? `공간 ${o.spaceCount}곳` : "준비 중"}
          </span>
        </Link>
        <RegionStar area={o.area} initialSaved={savedSet.has(o.area)} loggedIn={loggedIn} refresh className="-mr-2" />
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-11 pl-4 pr-3 border text-sm font-semibold transition-colors hover:bg-[var(--ed-soft)]"
        style={{ borderColor: "var(--ed-fg)" }}
      >
        <span className="text-xs font-normal" style={{ color: "var(--ed-dim)" }}>지역</span>
        <span>{current ?? "전체"}</span>
        <ChevronDownIcon className="w-4 h-4" strokeWidth={2} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="지역 선택">
          <button type="button" aria-label="닫기" className="absolute inset-0 cursor-default" style={{ background: "rgba(0,0,0,0.35)" }} onClick={close} />
          <div
            className="relative w-full md:max-w-[440px] max-h-[82vh] md:max-h-[70vh] flex flex-col"
            style={{ background: "var(--ed-bg)", color: "var(--ed-fg)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--ed-line)" }}>
              <p className="text-base font-bold">어느 지역의 공간을 볼까요?</p>
              <button type="button" onClick={close} aria-label="지역 선택 닫기" className="-mr-2 w-11 h-11 flex items-center justify-center">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pt-4">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 20))}
                placeholder="지역 이름으로 찾기"
                aria-label="지역 검색"
                className="w-full h-11 px-3 text-base md:text-sm border outline-none"
                style={{ borderColor: "var(--ed-line)", background: "var(--ed-bg)", color: "var(--ed-fg)" }}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6" style={{ overscrollBehavior: "contain" }}>
              {!query && (
                <Link
                  href={homeHref({ area: null, preview })}
                  scroll={false}
                  onClick={close}
                  aria-current={!current ? "true" : undefined}
                  className="flex items-center min-h-12 px-1 text-[15px]"
                  style={{ borderBottom: "1px solid var(--ed-line)", fontWeight: !current ? 700 : 500 }}
                >
                  전체 지역
                </Link>
              )}
              {shownSaved.length > 0 && (
                <>
                  <p className="pt-5 pb-1 ed-label" style={{ color: "var(--ed-dim)" }}>관심 지역</p>
                  <ul>{shownSaved.map(item)}</ul>
                </>
              )}
              {suggested.length > 0 && (
                <>
                  <p className="pt-5 pb-1 ed-label" style={{ color: "var(--ed-dim)" }}>추천 지역</p>
                  <ul>{suggested.map(item)}</ul>
                </>
              )}
              {others.length > 0 && (
                <>
                  <p className="pt-5 pb-1 ed-label" style={{ color: "var(--ed-dim)" }}>등록된 지역</p>
                  <ul>{others.map(item)}</ul>
                </>
              )}
              {shownSaved.length + shown.length === 0 && <p className="pt-6 text-sm" style={{ color: "var(--ed-dim)" }}>“{query}” 지역은 아직 소개된 공간이 없어요.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
