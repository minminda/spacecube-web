import Link from "next/link";
import EdImage from "./EdImage";
import type { StoryItem } from "@/lib/editorial/types";

/**
 * STORY 목록 — 첫 이야기는 크게(이미지 + 큰 제목), 나머지는 얇은 구분선 사이의 가로 행.
 * 블로그 카드 그리드처럼 보이지 않도록 카드 박스·그림자 없이 타이포그래피와 여백으로만 구분한다.
 */
export default function StoryList({ items, lead = true }: { items: StoryItem[]; lead?: boolean }) {
  const [first, ...rest] = lead ? items : [undefined, ...items];
  return (
    <div>
      {first && (
        <Link href={first.href} className="group grid gap-6 md:grid-cols-12 md:gap-12 md:items-end pb-12 md:pb-16">
          <div className="md:col-span-7">
            <EdImage image={first.cover} ratio="3 / 2" sizes="(min-width: 768px) 58vw, 100vw" priority />
          </div>
          <div className="md:col-span-5 space-y-4">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{first.eyebrow}</p>
            <p className="text-[28px] md:text-[40px] font-bold leading-[1.15] tracking-[-0.03em] break-keep group-hover:underline underline-offset-4 decoration-2">{first.title}</p>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>{first.summary}</p>
            {first.date && <p className="text-xs tabular-nums" style={{ color: "var(--ed-dim)" }}>{first.date}</p>}
          </div>
        </Link>
      )}
      {rest.length > 0 && (
        <ul style={{ borderTop: "1px solid var(--ed-fg)" }}>
          {rest.map((s) => s && (
            <li key={s.key} style={{ borderBottom: "1px solid var(--ed-line)" }}>
              <Link href={s.href} className="group grid grid-cols-[1fr_96px] md:grid-cols-[180px_1fr_200px] gap-4 md:gap-10 py-6 md:py-8 items-start">
                <p className="hidden md:block ed-label pt-1" style={{ color: "var(--ed-dim)" }}>{s.eyebrow}</p>
                <div className="space-y-2 min-w-0">
                  <p className="md:hidden ed-label" style={{ color: "var(--ed-dim)" }}>{s.eyebrow}</p>
                  <p className="text-lg md:text-2xl font-bold leading-snug tracking-tight break-keep group-hover:underline underline-offset-4">{s.title}</p>
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--ed-dim)" }}>{s.summary}</p>
                </div>
                <EdImage image={s.cover} ratio="4 / 5" sizes="(min-width: 768px) 200px, 96px" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
