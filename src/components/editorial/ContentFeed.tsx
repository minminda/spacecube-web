"use client";

import { useState } from "react";
import Link from "next/link";
import EdImage from "./EdImage";
import { CONTENT_KIND_LABEL, type ContentItem, type ContentKind } from "@/lib/editorial/types";

/* ── HOME STORIES ─────────────────────────────────────────────────────────
   발행된 CURATION / PEOPLE / SPACE를 publishedAt DESC로 섞어 보여주고, 상단 필터로 유형만 고른다.
   HOME 세로 길이는 콘텐츠 개수와 무관해야 한다:
   - 모바일: CSS scroll-snap 가로 스와이프. 카드 폭 ~62vw라 다음 카드가 일부 보인다. 최대 MOBILE_MAX개 + 끝 "전체보기" 카드.
   - 데스크톱: 한 번에 6개(3×2) 그리드 + 이전/다음 페이지.
   카드는 이미지·유형·제목·짧은 메타만 — 요약은 상세 페이지에서. 모든 카드 이미지는 같은 비율(4/5 · 데스크톱 3/2)로
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
  const visible = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const current = Math.min(page, pages - 1);
  const pageItems = visible.slice(current * PAGE, current * PAGE + PAGE);
  const mobileItems = visible.slice(0, MOBILE_MAX);
  const allHref = filter === "all" ? null : FILTER_HREF[filter];

  return (
    <div>
      <div className="flex items-end justify-between gap-4" style={{ borderBottom: "1px solid var(--ed-line)" }}>
        <div role="tablist" aria-label="콘텐츠 유형" className="ed-scroll-x flex gap-x-5 md:gap-x-7 overflow-x-auto whitespace-nowrap -mb-px">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { setFilter(f.key); setPage(0); }}
                className="shrink-0 py-3 text-[13px] md:text-sm font-semibold tracking-[0.08em] transition-colors border-b-2"
                style={{ color: active ? "var(--ed-fg)" : "#a3a3a3", borderColor: active ? "var(--ed-fg)" : "transparent" }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {allHref && (
          <Link href={allHref} className="shrink-0 py-3 text-xs font-semibold hover:underline underline-offset-4">
            전체보기 →
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-base py-10" style={{ color: "var(--ed-dim)" }}>아직 발행된 콘텐츠가 없습니다.</p>
      ) : (
        <>
          {/* 모바일 — 가로 스와이프 */}
          <div className="md:hidden -mx-5 pt-5">
            <ul className="ed-scroll-x flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 pb-1 scroll-pl-5 [-webkit-overflow-scrolling:touch]">
              {mobileItems.map((it) => (
                <li key={it.key} className="snap-start shrink-0 w-[62%] max-w-[260px]">
                  <FeedCard item={it} ratio="4 / 5" sizes="62vw" />
                </li>
              ))}
              <li className="snap-start shrink-0 w-[62%] max-w-[260px] pr-5 box-content">
                <EndCard filter={filter} href={allHref} />
              </li>
            </ul>
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
              {filter === "all" ? (
                <p className="flex items-center gap-5">
                  {ALL_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} className="text-xs font-semibold tracking-[0.08em] hover:underline underline-offset-4">{l.label} →</Link>
                  ))}
                </p>
              ) : <span />}
              {pages > 1 && (
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="이전 페이지" disabled={current === 0} onClick={() => setPage(current - 1)} className="w-10 h-10 flex items-center justify-center border transition-colors enabled:hover:bg-[var(--ed-fg)] enabled:hover:text-white disabled:opacity-30" style={{ borderColor: "var(--ed-line)" }}>←</button>
                  <span className="ed-label tabular-nums" style={{ color: "var(--ed-dim)" }}>{current + 1} / {pages}</span>
                  <button type="button" aria-label="다음 페이지" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="w-10 h-10 flex items-center justify-center border transition-colors enabled:hover:bg-[var(--ed-fg)] enabled:hover:text-white disabled:opacity-30" style={{ borderColor: "var(--ed-line)" }}>→</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** 모바일 가로 스크롤 마지막 카드 — 전체 탐색으로 이어준다. */
function EndCard({ filter, href }: { filter: Filter; href: string | null }) {
  return (
    <div className="flex flex-col justify-center gap-1 border px-4" style={{ borderColor: "var(--ed-line)", aspectRatio: "4 / 5" }}>
      {href ? (
        <Link href={href} className="py-3 text-sm font-semibold">전체보기 →</Link>
      ) : (
        ALL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center justify-between py-3 text-[13px] font-semibold tracking-[0.08em]" style={{ borderBottom: "1px solid var(--ed-line)" }}>
            {l.label}<span aria-hidden>→</span>
          </Link>
        ))
      )}
      {filter === "all" && <span className="sr-only">유형별 전체 보기</span>}
    </div>
  );
}

function FeedCard({ item, ratio, sizes }: { item: ContentItem; ratio: string; sizes: string }) {
  const sub = item.eyebrow;
  return (
    <Link href={item.href} className="group block">
      <EdImage image={item.image} ratio={ratio} sizes={sizes} />
      <div className="pt-3 space-y-1">
        <p className="ed-label flex items-center gap-2" style={{ color: "var(--ed-fg)" }}>
          {CONTENT_KIND_LABEL[item.kind]}
          {item.status !== "PUBLISHED" && <span className="px-1.5 py-0.5 text-[9px]" style={{ background: "#fff6e6", color: "#8a5a00" }}>DRAFT</span>}
        </p>
        <p className="text-base md:text-lg font-bold leading-snug tracking-tight line-clamp-2 break-keep group-hover:underline underline-offset-4">{item.title}</p>
        {sub && <p className="text-xs line-clamp-1" style={{ color: "var(--ed-dim)" }}>{sub}</p>}
      </div>
    </Link>
  );
}
