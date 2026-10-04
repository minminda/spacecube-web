import Link from "next/link";
import EdImage from "./EdImage";
import SpaceCard from "./SpaceCard";
import BlockRenderer, { type SaveState } from "./BlockRenderer";
import { curationEyebrow, type CurationView, type EditorialBlock, type LinkedSpace, type ResolvedImage, type SpaceView } from "@/lib/editorial/types";

interface Props {
  backHref: string;
  backLabel: string;
  /** "CURATION 001 · SITUATION · 상황" */
  eyebrow: string;
  area: string | null;
  title: string;
  /** 한 줄 선정 기준 */
  summary: string;
  /** "연남에서 발견한 3개의 공간 · 2026.10.04" */
  meta: string;
  cover: ResolvedImage;
  blocks: EditorialBlock[];
  blockSpaces: Map<string, SpaceView>;
  spaces: LinkedSpace[];
  related: CurationView[];
  saveState: SaveState;
}

/**
 * CURATION 상세 본문 — 공개 페이지(/curation/[slug])와 관리자 실시간 미리보기가 같은 컴포넌트를 쓴다(표현이 갈라지지 않게).
 * 지역이 있으면 지역명을 크게, 제목을 그 아래로. 본문 블록에 공간 카드가 없으면 선정 공간을 별도 구획(선정 이유 포함)으로.
 */
export default function CurationArticle(p: Props) {
  const bodyHasSpaceCards = p.blocks.some((b) => b.type === "SPACE_CARD");
  return (
    <main>
      <header className="ed-container pt-10 md:pt-16">
        <Link href={p.backHref} className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← {p.backLabel}</Link>
        <div className="mt-8 md:mt-12 grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7 space-y-5">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{p.eyebrow}</p>
            {p.area ? (
              <>
                <h1 className="text-[64px] md:text-[112px] font-bold leading-[0.95] tracking-[-0.05em]">{p.area}</h1>
                <p className="text-2xl md:text-3xl font-bold leading-snug tracking-tight">{p.title}</p>
              </>
            ) : (
              <h1 className="text-[40px] md:text-[64px] font-bold leading-[1.08] tracking-[-0.04em]">{p.title}</h1>
            )}
          </div>
          <div className="md:col-span-5 space-y-4">
            <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>{p.summary}</p>
            <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{p.meta}</p>
          </div>
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
          <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>선정된 공간</p>
          <div className="grid gap-10 grid-cols-1 md:grid-cols-3">
            {p.spaces.map((l) => (
              <SpaceCard key={l.space.id} space={l.space} note={l.note} showSummary={!l.note} save={{ saved: p.saveState.savedIds.has(l.space.id), loggedIn: p.saveState.loggedIn }} />
            ))}
          </div>
        </section>
      )}

      {p.related.length > 0 && (
        <section style={{ background: "var(--ed-soft)" }}>
          <div className="ed-container py-14 md:py-20">
            <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>다른 큐레이션</p>
            <div className="grid gap-10 md:grid-cols-2">
              {p.related.map((c) => (
                <Link key={c.id} href={`/curation/${c.slug}`} className="group grid grid-cols-[120px_1fr] md:grid-cols-[200px_1fr] gap-5 items-center">
                  <EdImage image={c.cover} ratio="1 / 1" sizes="200px" />
                  <div className="space-y-2">
                    <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{curationEyebrow(c)}</p>
                    <p className="text-lg md:text-xl font-bold leading-snug group-hover:underline underline-offset-4">{c.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
