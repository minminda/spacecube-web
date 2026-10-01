"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import EdImage from "./EdImage";
import PartnerMark from "./PartnerMark";
import { CONTENT_KIND_LABEL, type ContentItem, type ContentKind } from "@/lib/editorial/types";

/* ── HOME STORIES ─────────────────────────────────────────────────────────
   발행된 CURATION / PEOPLE / SPACE를 publishedAt DESC로 섞어 보여주고, 상단 필터로 유형만 고른다.
   HOME 세로 길이는 콘텐츠 개수와 무관해야 한다:
   - 모바일: CSS scroll-snap 가로 스와이프. 카드 폭 90%라 다음 카드는 끝이 살짝만 보인다. 최대 MOBILE_MAX개, LATEST와 같은 바 Indicator + 전체보기.
   - 데스크톱: 한 번에 6개(3×2) 그리드 + 이전/다음 페이지.
   카드는 이미지·유형·제목·짧은 메타만 — 요약은 상세 페이지에서. 모든 카드 이미지는 같은 비율(모바일 1/1 · 데스크톱 3/2)로
   맞춰 가로 스크롤 안에서 높이가 들쭉날쭉하지 않게 한다. 데이터는 서버가 한 번에 내려준다(콘텐츠 규모가 작음). ── */

type Filter = "all" | ContentKind;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "curation", label: "CURATION" },
  { key: "person", label: "PEOPLE" },
  { key: "space", label: "SPACE" },
];
const FILTER_HREF: Record<ContentKind, string> = { curation: "/curation", person: "/people", space: "/spaces" };
const ALL_LINKS = [
  { href: "/curation", label: "CURATION" },
  { href: "/people", label: "PEOPLE" },
  { href: "/spaces", label: "SPACE" },
];
const PAGE = 6;
const MOBILE_MAX = 8;

export default function ContentFeed({ items }: { items: ContentItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [idx, setIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const trackRef = useRef<HTMLUListElement>(null);
  const raf = useRef(0);
  const visible = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const current = Math.min(page, pages - 1);
  const pageItems = visible.slice(current * PAGE, current * PAGE + PAGE);
  const mobileItems = visible.slice(0, MOBILE_MAX);
  const allHref = filter === "all" ? null : FILTER_HREF[filter];

  // 스와이프 위치 → 현재 카드 번호. 가장 가까운 카드 시작점을 고르고, 끝까지 스크롤되면 마지막 카드로 본다.
  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = trackRef.current;
      if (!el) return;
      const cards = Array.from(el.children) as HTMLElement[];
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) { setIdx(cards.length - 1); return; }
      let best = 0, bestD = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft - 20 - el.scrollLeft);
        if (d < bestD) { bestD = d; best = i; }
      });
      setIdx(best);
    });
  }, []);
  const goTo = (i: number) => {
    const el = trackRef.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - 20, behavior: "smooth" });
  };

  return (
    <div>
      <div style={{ borderBottom: "1px solid var(--ed-line)" }}>
        <div role="tablist" aria-label="콘텐츠 유형" className="ed-scroll-x flex gap-x-5 md:gap-x-7 overflow-x-auto whitespace-nowrap -mb-px">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { setFilter(f.key); setPage(0); setIdx(0); setShowAll(false); }}
                className="shrink-0 py-3 text-[13px] md:text-sm font-semibold tracking-[0.08em] transition-colors border-b-2"
                style={{ color: active ? "var(--ed-fg)" : "#a3a3a3", borderColor: active ? "var(--ed-fg)" : "transparent" }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-base py-10" style={{ color: "var(--ed-dim)" }}>아직 발행된 콘텐츠가 없습니다.</p>
      ) : (
        <>
          {/* 모바일 — 가로 스와이프. 현재 카드가 주인공, 다음 카드는 끝이 살짝만 보인다 */}
          <div className="md:hidden -mx-5 pt-4">
            <ul
              key={filter}
              ref={trackRef}
              onScroll={onScroll}
              aria-label="스토리 목록"
              className="ed-scroll-x relative flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 pb-1 scroll-pl-5 overscroll-x-contain [-webkit-overflow-scrolling:touch]"
            >
              {mobileItems.map((it) => (
                <li key={it.key} className="snap-start snap-always shrink-0 w-[90%] max-w-[420px]">
                  <FeedCard item={it} ratio="1 / 1" sizes="90vw" />
                </li>
              ))}
            </ul>
            <div className="px-5 pt-3 flex items-center justify-between gap-4">
              {mobileItems.length > 1 ? (
                <div className="flex items-center gap-2" role="tablist" aria-label="스토리 위치">
                  {mobileItems.map((it, i) => (
                    <button
                      key={it.key}
                      type="button"
                      role="tab"
                      aria-selected={i === idx}
                      aria-label={`${i + 1}번째 스토리: ${it.title}`}
                      onClick={() => goTo(i)}
                      className="h-6 flex items-center"
                    >
                      <span className="block h-[3px] transition-all" style={{ width: i === idx ? 28 : 14, background: i === idx ? "var(--ed-fg)" : "#cfcfcf" }} />
                    </button>
                  ))}
                </div>
              ) : <span />}
              <ViewAll href={allHref} open={showAll} onToggle={() => setShowAll((v) => !v)} />
            </div>
            {showAll && <AllLinks />}
          </div>

          {/* 데스크톱 — 6개 단위 그리드 */}
          <div className="hidden md:block pt-8">
            <ul className="grid grid-cols-3 gap-x-8 gap-y-8">
              {pageItems.map((it) => (
                <li key={it.key}>
                  <FeedCard item={it} ratio="3 / 2" sizes="33vw" />
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center justify-between gap-4">
              <ViewAll href={allHref} open={showAll} onToggle={() => setShowAll((v) => !v)} />
              {pages > 1 && (
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="이전 페이지" disabled={current === 0} onClick={() => setPage(current - 1)} className="w-10 h-10 flex items-center justify-center border transition-colors enabled:hover:bg-[var(--ed-fg)] enabled:hover:text-white disabled:opacity-30" style={{ borderColor: "var(--ed-line)" }}>←</button>
                  <span className="ed-label tabular-nums" style={{ color: "var(--ed-dim)" }}>{current + 1} / {pages}</span>
                  <button type="button" aria-label="다음 페이지" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="w-10 h-10 flex items-center justify-center border transition-colors enabled:hover:bg-[var(--ed-fg)] enabled:hover:text-white disabled:opacity-30" style={{ borderColor: "var(--ed-line)" }}>→</button>
                </div>
              )}
            </div>
            {showAll && <AllLinks />}
          </div>
        </>
      )}
    </div>
  );
}

/** 전체보기 CTA — 필터가 있으면 해당 유형 페이지로, ALL이면 유형 선택 링크를 펼친다(통합 목록 페이지는 없음). */
function ViewAll({ href, open, onToggle }: { href: string | null; open: boolean; onToggle: () => void }) {
  const cls = "shrink-0 text-xs font-semibold hover:underline underline-offset-4";
  if (href) return <Link href={href} className={cls}>전체보기 →</Link>;
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className={cls}>
      전체보기 {open ? "↑" : "↓"}
    </button>
  );
}

function AllLinks() {
  return (
    <div className="pt-2 flex flex-wrap gap-x-5 gap-y-1 px-5 md:px-0 md:pt-4 md:justify-end">
      {ALL_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="py-1 text-xs font-semibold tracking-[0.08em] hover:underline underline-offset-4">{l.label} →</Link>
      ))}
    </div>
  );
}

function FeedCard({ item, ratio, sizes }: { item: ContentItem; ratio: string; sizes: string }) {
  const sub = item.eyebrow;
  return (
    <Link href={item.href} className="group block">
      <EdImage image={item.image} ratio={ratio} sizes={sizes} />
      <div className="pt-3 space-y-1">
        <p className="ed-label flex items-center justify-between gap-2" style={{ color: "var(--ed-fg)" }}>
          <span className="flex items-center gap-2">
            {CONTENT_KIND_LABEL[item.kind]}
            {item.status !== "PUBLISHED" && <span className="px-1.5 py-0.5 text-[9px]" style={{ background: "#fff6e6", color: "#8a5a00" }}>DRAFT</span>}
          </span>
          {item.partner && <PartnerMark size={15} />}
        </p>
        <p className="text-base md:text-lg font-bold leading-snug tracking-tight line-clamp-2 break-keep group-hover:underline underline-offset-4">{item.title}</p>
        {sub && <p className="text-xs line-clamp-1" style={{ color: "var(--ed-dim)" }}>{sub}</p>}
      </div>
    </Link>
  );
}
