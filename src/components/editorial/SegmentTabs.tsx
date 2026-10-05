import Link from "next/link";

interface Segment {
  key: string;
  label: string;
  href: string;
}

/**
 * 가로 세그먼트 — 같은 폭의 칸 두세 개를 직선 테두리로 붙인다. 선택된 칸은 검정 바탕 · 흰 글씨, 나머지는 흰 바탕 · 검정 글씨.
 * 링크 기반(서버 렌더, 공유 가능한 URL). 휴대폰은 콘텐츠 폭 전체, 데스크톱은 최대 360px. 높이 46px(터치 영역).
 * 라운드 · 그림자 없음. 접근성: tablist/tab + aria-selected(색만으로 구분하지 않게).
 */
export default function SegmentTabs({ segments, active, label }: { segments: Segment[]; active: string; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid w-full md:max-w-[360px]" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))`, border: "1px solid var(--ed-fg)" }}>
      {segments.map((s, i) => {
        const on = s.key === active;
        return (
          <Link
            key={s.key}
            href={s.href}
            role="tab"
            aria-selected={on}
            scroll={false}
            className="inline-flex items-center justify-center h-[46px] text-sm font-semibold transition-colors"
            style={{
              background: on ? "var(--ed-fg)" : "var(--ed-bg)",
              color: on ? "var(--ed-bg)" : "var(--ed-fg)",
              borderLeft: i > 0 ? "1px solid var(--ed-fg)" : undefined,
            }}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
