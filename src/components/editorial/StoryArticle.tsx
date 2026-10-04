import Link from "next/link";
import EdImage from "./EdImage";
import SpaceCard from "./SpaceCard";
import BlockRenderer, { type SaveState } from "./BlockRenderer";
import StoryCard, { INDEX_GRID_CLASS, INDEX_GRID_SIZES } from "./StoryCard";
import type { EditorialBlock, LinkedSpace, ResolvedImage, SpaceView, StoryItem } from "@/lib/editorial/types";

interface Props {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  /** 짧은 deck/intro */
  summary: string;
  date?: string;
  cover: ResolvedImage;
  blocks: EditorialBlock[];
  blockSpaces: Map<string, SpaceView>;
  /** 본문 아래 "이 이야기의 공간" */
  spaces: LinkedSpace[];
  spacesLabel: string;
  related: StoryItem[];
  saveState: SaveState;
}

/**
 * STORY 상세(PEOPLE · THOUGHT 공용) — 큰 제목 → 짧은 deck → 대표 이미지 → 읽기 폭 본문(사진·인용 블록) → 공간 → 다른 이야기.
 * 블로그 카드형이 아니라 한 편의 글로 읽히도록 여백과 타이포그래피만 쓴다.
 */
export default function StoryArticle(p: Props) {
  const bodyHasSpaceCards = p.blocks.some((b) => b.type === "SPACE_CARD");
  return (
    <main>
      <header className="ed-container pt-10 md:pt-16">
        <Link href={p.backHref} className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← {p.backLabel}</Link>
        <div className="mt-8 md:mt-12 max-w-[900px] space-y-6">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{p.eyebrow}</p>
          <h1 className="text-[34px] md:text-[56px] font-bold leading-[1.15] tracking-[-0.03em] break-keep">{p.title}</h1>
          <p className="text-base md:text-xl leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>{p.summary}</p>
          {p.date && <p className="text-xs tabular-nums" style={{ color: "var(--ed-dim)" }}>{p.date}</p>}
        </div>
      </header>

      <div className="ed-container pt-10 md:pt-14">
        <EdImage image={p.cover} ratio="16 / 9" sizes="(min-width: 1200px) 1120px, 100vw" priority />
      </div>

      {p.blocks.length > 0 && (
        <article className="ed-container py-16 md:py-24">
          <BlockRenderer blocks={p.blocks} spaces={p.blockSpaces} saveState={p.saveState} />
        </article>
      )}

      {!bodyHasSpaceCards && p.spaces.length > 0 && (
        <section className="ed-container py-16 md:pb-20" style={{ borderTop: "1px solid var(--ed-line)" }}>
          <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>{p.spacesLabel}</p>
          <div className="grid gap-y-10 md:grid-cols-3 md:gap-x-8">
            {p.spaces.map((l) => (
              <SpaceCard
                key={l.space.id}
                space={l.space}
                mobileRatio="3 / 2" variant="feature"
                sizes="(min-width: 768px) 33vw, 100vw"
                note={l.note}
                showSummary={!l.note}
                save={{ saved: p.saveState.savedIds.has(l.space.id), loggedIn: p.saveState.loggedIn }}
              />
            ))}
          </div>
        </section>
      )}

      {p.related.length > 0 && (
        <section style={{ background: "var(--ed-soft)" }}>
          <div className="ed-container py-14 md:py-20">
            <div className="flex items-baseline justify-between pb-6">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>다른 이야기</p>
              <Link href="/story" className="text-xs hover:underline underline-offset-4">STORY 전체 →</Link>
            </div>
            <div className={INDEX_GRID_CLASS}>
              {p.related.map((r) => (
                <StoryCard key={r.key} href={r.href} image={r.cover} eyebrow={r.eyebrow} title={r.title} line={r.summary} ratio="4 / 5" sizes={INDEX_GRID_SIZES} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
