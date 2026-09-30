"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CubeGlyph from "@/components/CubeGlyph";
import { CONTENT_KIND_LABEL, type ContentItem } from "@/lib/editorial/types";

/* ── HOME LATEST — Editorial Hero Slider ─────────────────────────────────
   최신 발행 콘텐츠(최대 5개)를 한 번에 하나씩 크게 보여준다(작은 카드 나열형 캐러셀이 아님).
   - 6초마다 자동 전환, 마지막 다음은 처음으로 순환. 수동 조작 시 그 슬라이드부터 타이머 재시작.
   - 일시 정지: 마우스를 올렸을 때, 키보드 포커스가 안에 있을 때, 탭이 백그라운드일 때.
   - prefers-reduced-motion: 자동 전환과 전환 애니메이션을 끈다(수동 이동만).
   - 터치 스와이프, ←/→ 키, 좌우 버튼, 인디케이터, "01 / 05".
   - 전환은 opacity fade만. 첫 이미지만 priority, 나머지는 lazy.
   슬라이더만 클라이언트 컴포넌트다 — HOME 나머지는 서버 컴포넌트. ── */

const INTERVAL_MS = 6000;
const CTA: Record<ContentItem["kind"], string> = { curation: "Explore", person: "Read", space: "View" };

function advance(s: { index: number; seen: Set<number> }, next: number, count: number) {
  const index = ((next % count) + count) % count;
  const seen = new Set(s.seen);
  seen.add(index);
  seen.add((index + 1) % count);
  return { index, seen };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function LatestSlider({ items }: { items: ContentItem[] }) {
  const count = items.length;
  // index와 "이미지를 한 번이라도 띄운 슬라이드"를 함께 관리 — 현재·다음 슬라이드 이미지만 렌더해
  // 첫 화면에서 큰 이미지 5장을 한꺼번에 받지 않는다(한 번 본 이미지는 유지해 되돌아갈 때 깜빡임 없음).
  const [state, setState] = useState(() => ({ index: 0, seen: new Set([0, 1]) }));
  const index = state.index;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  // 수동 조작마다 증가 — 자동 전환 타이머를 그 시점부터 다시 시작시키는 키
  const [tick, setTick] = useState(0);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    const onVis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const paused = hovered || focused || hidden || reduced || count < 2;

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => setState((s) => advance(s, s.index + 1, count)), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, count, tick]);

  const go = useCallback(
    (next: number) => {
      setState((s) => advance(s, next, count));
      setTick((t) => t + 1);
    },
    [count],
  );

  if (count === 0) return null;
  const multi = count > 1;
  const current = items[index];
  const fade = reduced ? "" : "transition-opacity duration-700 ease-out";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="최신 콘텐츠"
      className="ed-container pt-6 pb-14 md:pt-10 md:pb-20"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (!multi || touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex items-center justify-between pb-5 md:pb-8" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
        <p className="ed-label">Latest</p>
        {multi && (
          <p className="ed-label tabular-nums" style={{ color: "var(--ed-dim)" }}>
            <span style={{ color: "var(--ed-fg)" }}>{pad(index + 1)}</span> / {pad(count)}
          </p>
        )}
      </div>

      <div className="relative pt-6 md:pt-10">
        {/* 이미지 — 모든 슬라이드를 겹쳐 두고 opacity만 바꾼다(첫 장만 priority, 나머지 lazy) */}
        <div className="grid gap-6 md:grid-cols-12 md:gap-12 md:items-stretch">
          <div className="md:col-span-5 md:order-1 order-2 flex flex-col">
            <div className="relative flex-1 min-h-[260px] md:min-h-0" aria-live={paused ? "polite" : "off"}>
              {items.map((it, i) => (
                <div
                  key={it.key}
                  className={`${i === index ? "relative opacity-100" : "absolute inset-0 opacity-0 pointer-events-none"} ${fade} flex flex-col`}
                  aria-hidden={i !== index}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} / ${count}`}
                >
                  <p className="ed-label hidden md:block" style={{ color: "var(--ed-dim)" }}>
                    {CONTENT_KIND_LABEL[it.kind]}
                    {it.date && <span className="ml-3 tabular-nums">{it.date}</span>}
                  </p>
                  <p className="ed-label md:mt-6" style={{ color: "var(--ed-dim)" }}>{it.eyebrow}</p>
                  <h2 className="mt-3 md:mt-4 text-[28px] leading-[1.22] md:text-[44px] md:leading-[1.15] font-bold tracking-[-0.03em]">
                    <Link href={it.href} tabIndex={i === index ? 0 : -1} className="hover:underline underline-offset-[6px] decoration-2">
                      {it.title}
                    </Link>
                  </h2>
                  {it.summary && <p className="mt-4 text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>{it.summary}</p>}
                  {it.meta && <p className="mt-4 text-sm" style={{ color: "var(--ed-dim)" }}>{it.meta}</p>}
                  <div className="mt-6 md:mt-auto md:pt-10">
                    <Link href={it.href} tabIndex={i === index ? 0 : -1} className="inline-flex items-center gap-2 text-sm font-semibold hover:underline underline-offset-4">
                      {CTA[it.kind]} <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-7 md:order-2 order-1">
            {/* 모바일: 이미지 위에 유형·날짜 */}
            <p className="ed-label pb-3 md:hidden" style={{ color: "var(--ed-dim)" }}>
              {CONTENT_KIND_LABEL[current.kind]}
              {current.date && <span className="ml-3 tabular-nums">{current.date}</span>}
            </p>
            <Link href={current.href} tabIndex={-1} aria-hidden className="block relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3", background: "var(--ed-soft)" }}>
              {items.map((it, i) => (
                <div key={it.key} className={`absolute inset-0 ${fade} ${i === index ? "opacity-100" : "opacity-0"}`}>
                  {it.image.src && state.seen.has(i) ? (
                    <Image
                      src={it.image.src}
                      alt={it.image.alt}
                      fill
                      sizes="(min-width: 768px) 58vw, 100vw"
                      priority={i === 0}
                      loading={i === 0 ? undefined : "lazy"}
                      className="object-cover"
                      style={{ objectPosition: it.image.position ?? "50% 50%" }}
                    />
                  ) : it.image.src ? null : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-12 h-12" style={{ color: "#c4c4c4" }}>
                        <CubeGlyph outlineWidth={0.9} edgeWidth={0.8} />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </Link>
          </div>
        </div>

        {multi && (
          <div className="mt-6 md:mt-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2" role="tablist" aria-label="슬라이드 선택">
              {items.map((it, i) => (
                <button
                  key={it.key}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`${i + 1}번째: ${it.title}`}
                  onClick={() => go(i)}
                  className="h-6 flex items-center"
                >
                  <span className="block h-[3px] transition-all" style={{ width: i === index ? 28 : 14, background: i === index ? "var(--ed-fg)" : "#cfcfcf" }} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="이전 콘텐츠" onClick={() => go(index - 1)} className="w-11 h-11 flex items-center justify-center border transition-colors hover:bg-[var(--ed-fg)] hover:text-white" style={{ borderColor: "var(--ed-line)" }}>
                ←
              </button>
              <button type="button" aria-label="다음 콘텐츠" onClick={() => go(index + 1)} className="w-11 h-11 flex items-center justify-center border transition-colors hover:bg-[var(--ed-fg)] hover:text-white" style={{ borderColor: "var(--ed-line)" }}>
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
