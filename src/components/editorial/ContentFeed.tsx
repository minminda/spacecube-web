"use client";

import { useState } from "react";
import Link from "next/link";
import EdImage from "./EdImage";
import { CONTENT_KIND_LABEL, type ContentItem, type ContentKind } from "@/lib/editorial/types";

/* ── HOME CONTENT FEED ────────────────────────────────────────────────────
   발행된 CURATION / PEOPLE / SPACE를 publishedAt DESC로 섞어 보여주고, 상단 필터로 유형만 고른다.
   데이터는 서버가 한 번에 내려주고(콘텐츠 규모가 작음) 필터·더보기는 클라이언트 상태로만 처리한다.
   유형별 카드 비율을 달리해 차이를 주되, 같은 타이포·라벨 체계를 공유한다:
   CURATION = 넓은 가로 이미지(2칸), PEOPLE = 세로 인물·이야기, SPACE = 정사각 공간 사진 + 지역·종류. ── */

type Filter = "all" | ContentKind;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "curation", label: "CURATION" },
  { key: "person", label: "PEOPLE" },
  { key: "space", label: "SPACE" },
];
const PAGE = 9;

export default function ContentFeed({ items }: { items: ContentItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);
  const visible = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const shown = visible.slice(0, limit);

  return (
    <div>
      <div role="tablist" aria-label="콘텐츠 유형" className="flex flex-wrap gap-x-6 gap-y-2 pb-6 mb-10 md:mb-14" style={{ borderBottom: "1px solid var(--ed-line)" }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = f.key === "all" ? items.length : items.filter((i) => i.kind === f.key).length;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setFilter(f.key); setLimit(PAGE); }}
              className="relative py-1 text-sm md:text-[15px] font-semibold tracking-[0.08em] transition-colors"
              style={{ color: active ? "var(--ed-fg)" : "#a3a3a3" }}
            >
              {f.label}
              <sup className="ml-1 text-[10px] font-medium tabular-nums">{n}</sup>
              {active && <span aria-hidden className="absolute left-0 right-0 -bottom-[25px] h-[2px]" style={{ background: "var(--ed-fg)" }} />}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="text-base py-10" style={{ color: "var(--ed-dim)" }}>아직 발행된 콘텐츠가 없습니다.</p>
      ) : (
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-3 md:gap-x-10 md:gap-y-20">
          {shown.map((it) => <FeedCard key={it.key} item={it} />)}
        </div>
      )}

      {visible.length > limit && (
        <div className="mt-14 flex justify-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="tap-target px-8 text-sm font-semibold border transition-colors hover:bg-[var(--ed-fg)] hover:text-white" style={{ borderColor: "var(--ed-fg)" }}>
            더 보기 ({visible.length - limit})
          </button>
        </div>
      )}
    </div>
  );
}

const RATIO: Record<ContentKind, string> = { curation: "16 / 10", person: "4 / 5", space: "1 / 1" };

function FeedCard({ item }: { item: ContentItem }) {
  const wide = item.kind === "curation";
  return (
    <Link href={item.href} className={`group block ${wide ? "md:col-span-2" : ""}`}>
      <EdImage image={item.image} ratio={RATIO[item.kind]} sizes={wide ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 100vw"} />
      <div className="pt-4 space-y-2">
        <p className="ed-label flex items-center gap-3" style={{ color: "var(--ed-dim)" }}>
          <span style={{ color: "var(--ed-fg)" }}>{CONTENT_KIND_LABEL[item.kind]}</span>
          {item.status !== "PUBLISHED" && <span className="px-1.5 py-0.5 text-[9px]" style={{ background: "#fff6e6", color: "#8a5a00" }}>DRAFT</span>}
          {item.date && <span className="tabular-nums font-medium">{item.date}</span>}
        </p>
        <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{item.eyebrow}</p>
        <p className={`${wide ? "text-2xl md:text-[30px]" : "text-xl"} font-bold leading-snug tracking-tight group-hover:underline underline-offset-4`}>{item.title}</p>
        {item.summary && <p className="text-sm md:text-[15px] leading-relaxed line-clamp-3" style={{ color: "var(--ed-dim)" }}>{item.summary}</p>}
        {item.meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{item.meta}</p>}
      </div>
    </Link>
  );
}
