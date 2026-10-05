"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { finderHref } from "@/lib/finder/spaceFinder";

type Query = { area: string | null; category: string | null; q: string };
type Which = "area" | "category";

/**
 * 추천 > 공간의 조건 — [전체][지역 ▼] / [공간 검색][카테고리 ▼].
 * 지역 · 카테고리는 버튼 하나로 접어 두고, 누르면 아래로 목록이 펼쳐진다. 고르면 버튼 글자가 그 값이 된다(연남 ▼ · 카페 ▼).
 * 선택지는 서버가 지금 공개된 공간에서 뽑아 준다(지역은 normalizeArea로 정리된 이름, 카테고리는 관리자 등록 값 그대로).
 * 항목은 링크라 고를 때마다 주소(?area= · ?category= · ?q=)가 바뀌고, 뒤로/앞으로가 그대로 동작한다.
 * 두 목록은 동시에 열리지 않는다. 바깥을 누르거나 Esc를 누르면 닫힌다. 정렬은 서버에서 기존 개인화 순서 그대로.
 */
export default function FinderFilters({ query, areas, categories }: { query: Query; areas: string[]; categories: string[] }) {
  const [open, setOpen] = useState<Which | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<Which, HTMLButtonElement | null>>({ area: null, category: null });

  useEffect(() => {
    if (!open) return;
    const outside = (t: EventTarget | null) => !rootRef.current?.contains(t as Node);
    const onDown = (e: MouseEvent) => {
      if (outside(e.target)) setOpen(null);
    };
    // 터치는 바로 닫지 않는다 — 바깥을 손가락으로 스크롤하는 중에는 열린 채로 두고, 거의 안 움직인 탭(10px 미만)일 때만 닫는다
    let start: { x: number; y: number; outside: boolean } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = t ? { x: t.clientX, y: t.clientY, outside: outside(e.target) } : null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (start?.outside && t && Math.hypot(t.clientX - start.x, t.clientY - start.y) < 10) setOpen(null);
      start = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        buttons.current[open]?.focus();
        setOpen(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (w: Which) => setOpen((cur) => (cur === w ? null : w));

  const areaItems = areas.map((a) => ({ label: a, href: finderHref({ ...query, area: a }), selected: query.area === a }));
  const categoryItems = [
    { label: "전체 카테고리", href: finderHref({ ...query, category: null }), selected: !query.category },
    ...categories.map((c) => ({ label: c, href: finderHref({ ...query, category: c }), selected: query.category === c })),
  ];

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="flex gap-2">
        <Link
          href={finderHref({ ...query, area: null })}
          scroll={false}
          aria-current={!query.area ? "page" : undefined}
          className="inline-flex items-center h-10 px-4 text-sm whitespace-nowrap shrink-0"
          style={!query.area ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)", fontWeight: 600 } : { border: "1px solid var(--ed-line)" }}
        >
          전체
        </Link>
        <Dropdown
          which="area"
          label={query.area ?? "지역"}
          chosen={!!query.area}
          listLabel="지역"
          items={areaItems}
          open={open === "area"}
          onToggle={() => toggle("area")}
          onPick={() => setOpen(null)}
          buttonRef={(el) => { buttons.current.area = el; }}
          align="left"
        />
      </div>

      <div className="flex gap-2 md:max-w-[480px]">
        {/* 검색 — 고른 지역 · 카테고리 안에서 공간 이름 위주로 좁힌다(정렬은 그대로) */}
        <form method="get" action="/find" role="search" className="flex-1 min-w-0">
          {query.area && <input type="hidden" name="area" value={query.area} />}
          {query.category && <input type="hidden" name="category" value={query.category} />}
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="공간 검색"
            aria-label="공간 검색"
            enterKeyHint="search"
            className="w-full h-10 px-3 text-base md:text-sm outline-none"
            style={{ border: "1px solid var(--ed-line)" }}
          />
        </form>
        <Dropdown
          which="category"
          label={query.category ?? "카테고리"}
          chosen={!!query.category}
          listLabel="카테고리"
          items={categoryItems}
          open={open === "category"}
          onToggle={() => toggle("category")}
          onPick={() => setOpen(null)}
          buttonRef={(el) => { buttons.current.category = el; }}
          align="right"
          className="max-w-[42%] md:max-w-[200px]"
        />
      </div>
    </div>
  );
}

function Dropdown({ which, label, chosen, listLabel, items, open, onToggle, onPick, buttonRef, align, className = "" }: {
  which: Which;
  label: string;
  chosen: boolean;
  listLabel: string;
  items: { label: string; href: string; selected: boolean }[];
  open: boolean;
  onToggle: () => void;
  onPick: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  align: "left" | "right";
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const listId = `finder-${which}-list`;

  // 열리면 선택된 항목(없으면 첫 항목)에 포커스 — 화살표로 이동, Tab으로 나가면 닫히지 않아도 괜찮다(바깥 클릭 · Esc로 닫힘)
  useEffect(() => {
    if (!open) return;
    const links = [...(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    (links.find((a) => a.getAttribute("aria-current") === "true") ?? links[0])?.focus({ preventScroll: true });
  }, [open]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const links = [...(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : e.key === "ArrowDown" ? Math.min(links.length - 1, i + 1) : Math.max(0, i - 1);
    links[next]?.focus();
  };

  return (
    <div className={`relative shrink-0 min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={chosen ? `${listLabel}: ${label}` : listLabel}
        className="inline-flex items-center gap-1.5 w-full h-10 px-3.5 text-sm"
        style={{ border: "1px solid var(--ed-fg)", background: "var(--ed-bg)", color: "var(--ed-fg)", fontWeight: chosen ? 600 : 400 }}
      >
        <span className="truncate">{label}</span>
        <svg aria-hidden viewBox="0 0 10 6" className="w-2.5 h-1.5 shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }}>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          aria-label={listLabel}
          onKeyDown={onListKey}
          className={`absolute z-30 top-[calc(100%+4px)] ${align === "right" ? "right-0" : "left-0"} min-w-full w-max max-w-[calc(100vw-32px)] max-h-[min(320px,45vh)] overflow-y-auto overscroll-contain py-1`}
          style={{ background: "var(--ed-bg)", border: "1px solid var(--ed-fg)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        >
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                scroll={false}
                onClick={onPick}
                aria-current={it.selected ? "true" : undefined}
                className="flex items-center justify-between gap-6 px-4 py-2.5 text-sm whitespace-nowrap outline-none focus-visible:bg-[var(--ed-soft)] hover:bg-[var(--ed-soft)]"
                style={{ fontWeight: it.selected ? 600 : 400 }}
              >
                <span>{it.label}</span>
                <span aria-hidden className="w-3 text-right">{it.selected ? "✓" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
