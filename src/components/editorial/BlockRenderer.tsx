import Link from "next/link";
import EdImage from "./EdImage";
import PartnerMark from "./PartnerMark";
import SaveButton from "./SaveButton";
import { spaceCoverImage, spaceHref, type BlockImage, type EditorialBlock, type ResolvedImage, type SpaceView } from "@/lib/editorial/types";

interface Props {
  blocks: EditorialBlock[];
  /** SPACE_CARD 블록이 가리키는 공간(페이지가 공개 규칙에 맞춰 미리 조회) — 없는 공간 카드는 표시하지 않는다 */
  spaces: Map<string, SpaceView>;
  /** 공간 카드 저장 버튼 — 넘기면 표시(서버가 저장 상태를 알 때만) */
  saveState?: SaveState;
}

export interface SaveState {
  savedIds: Set<string>;
  loggedIn: boolean;
}

/**
 * 에디토리얼 본문 블록 렌더러(Editorial CMS 블록) — 텍스트는 읽기 폭(640px), 이미지는 넓게 써서 리듬을 만든다.
 * 공간 카드는 공개 SPACE 상세(/spaces/[slug])로만 연결한다.
 */
export default function BlockRenderer({ blocks, spaces, saveState }: Props) {
  return (
    <div className="space-y-10 md:space-y-14">
      {blocks.map((block, i) => (
        <Block key={i} block={block} spaces={spaces} saveState={saveState} />
      ))}
    </div>
  );
}

const READ = "max-w-[640px] mx-auto";

function img(i: BlockImage): ResolvedImage {
  return { src: i.url, alt: i.alt ?? "", caption: i.caption };
}

function ratioOf(i: BlockImage, fallback: string): string {
  return i.width && i.height ? `${i.width} / ${i.height}` : fallback;
}

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function Block({ block, spaces, saveState }: { block: EditorialBlock; spaces: Map<string, SpaceView>; saveState?: SaveState }) {
  switch (block.type) {
    case "HEADING":
      return <h2 className={`${READ} text-xl md:text-2xl font-bold leading-snug tracking-tight`}>{block.text}</h2>;
    case "TEXT":
      return block.small ? (
        <p className={`${READ} text-xs leading-relaxed whitespace-pre-line`} style={{ color: "var(--ed-dim)" }}>{block.text}</p>
      ) : (
        <div className={`${READ} space-y-5`}>
          {paragraphs(block.text).map((p, i) => (
            <p key={i} className="text-base md:text-[17px] leading-[1.85] whitespace-pre-line">{p}</p>
          ))}
        </div>
      );
    case "DIVIDER":
      return <div className={`${READ} h-px`} style={{ background: "var(--ed-line)" }} />;
    case "QUOTE":
      return (
        <figure className="max-w-[820px] mx-auto py-4 md:py-8">
          <blockquote className="text-2xl md:text-4xl font-bold leading-snug tracking-tight">“{block.text}”</blockquote>
          {block.cite && <figcaption className="mt-4 text-sm" style={{ color: "var(--ed-dim)" }}>— {block.cite}</figcaption>}
        </figure>
      );
    case "IMAGE":
      return (
        <figure className={block.wide ? "" : "max-w-[900px] mx-auto"}>
          <EdImage image={img(block.image)} ratio={ratioOf(block.image, "3 / 2")} sizes="(min-width: 768px) 900px, 100vw" />
          {block.image.caption && <figcaption className="mt-2 text-xs" style={{ color: "var(--ed-dim)" }}>{block.image.caption}</figcaption>}
        </figure>
      );
    case "GALLERY":
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
          {block.images.map((im, i) => (
            <figure key={i}>
              <EdImage image={img(im)} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 50vw" />
              {im.caption && <figcaption className="mt-1.5 text-[11px]" style={{ color: "var(--ed-dim)" }}>{im.caption}</figcaption>}
            </figure>
          ))}
        </div>
      );
    case "IMAGE_TEXT":
      return (
        <div className={`max-w-[900px] mx-auto grid md:grid-cols-2 gap-6 md:gap-10 items-center ${block.reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
          <figure>
            <EdImage image={img(block.image)} ratio="4 / 5" sizes="(min-width: 768px) 450px, 100vw" />
            {block.image.caption && <figcaption className="mt-2 text-xs" style={{ color: "var(--ed-dim)" }}>{block.image.caption}</figcaption>}
          </figure>
          <div className="space-y-3">
            {block.title && <p className="text-lg md:text-xl font-bold leading-snug">{block.title}</p>}
            {paragraphs(block.text).map((p, i) => (
              <p key={i} className="text-base leading-[1.85] whitespace-pre-line">{p}</p>
            ))}
          </div>
        </div>
      );
    case "QNA":
      return (
        <dl className={`${READ} space-y-6`}>
          {block.items.map((item, i) => (
            <div key={i} className="space-y-2">
              <dt className="text-base font-bold leading-snug">Q. {item.q}</dt>
              <dd className="text-base leading-[1.85] whitespace-pre-line" style={{ color: "#333" }}>{item.a}</dd>
            </div>
          ))}
        </dl>
      );
    case "SPACE_CARD": {
      const space = spaces.get(block.spaceId);
      if (!space) return null;
      const meta = [space.area, space.category].filter(Boolean).join(" · ");
      return (
        <div className="group max-w-[900px] mx-auto grid grid-cols-[112px_1fr] md:grid-cols-[280px_1fr] gap-5 md:gap-10 items-center">
          <Link href={spaceHref(space.slug)} tabIndex={-1} aria-hidden>
            <EdImage image={spaceCoverImage(space)} ratio="4 / 5" sizes="(min-width: 768px) 280px, 112px" />
          </Link>
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>SPACE</p>
            <div className="flex items-start justify-between gap-3">
              <Link href={spaceHref(space.slug)} className="flex items-center gap-2.5 text-lg md:text-2xl font-bold leading-snug">
                <span className="group-hover:underline underline-offset-4">{space.name}</span>{space.cubeAvailable && <PartnerMark size={16} />}
              </Link>
              {saveState && <SaveButton spaceId={space.id} spaceName={space.name} initialSaved={saveState.savedIds.has(space.id)} loggedIn={saveState.loggedIn} />}
            </div>
            {meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{meta}</p>}
            {(block.note ?? space.summary) && (
              <p className="text-sm md:text-base leading-relaxed pt-1">{block.note ?? space.summary}</p>
            )}
            <Link href={spaceHref(space.slug)} className="inline-block text-xs pt-1" style={{ color: "var(--ed-dim)" }}>공간 보기 →</Link>
          </div>
        </div>
      );
    }
  }
}
