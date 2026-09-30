import Link from "next/link";
import EdImage from "./EdImage";
import { getSpace, resolveImage, spaceCoverImage, spaceHref } from "@/content/spaces";
import type { ContentBlock } from "@/content/types";

interface Props {
  blocks: ContentBlock[];
}

/** 에디토리얼 본문 블록 렌더러 — 공간 참조는 홈페이지 SPACE(정적 데이터)만, 링크는 /spaces/[slug]만. — 텍스트는 읽기 폭(640px), 이미지는 넓게 써서 리듬을 만든다. */
export default function BlockRenderer({ blocks }: Props) {
  return (
    <div className="space-y-10 md:space-y-14">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

const READ = "max-w-[640px] mx-auto";

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "HEADING":
      return <h2 className={`${READ} text-xl md:text-2xl font-bold leading-snug tracking-tight`}>{block.text}</h2>;
    case "TEXT":
      return <p className={`${READ} text-base md:text-[17px] leading-[1.85]`}>{block.text}</p>;
    case "CAPTION":
      return <p className={`${READ} text-xs leading-relaxed`} style={{ color: "var(--ed-dim)" }}>{block.text}</p>;
    case "DIVIDER":
      return <div className={`${READ} h-px`} style={{ background: "var(--ed-line)" }} />;
    case "QUOTE":
      return (
        <figure className="max-w-[820px] mx-auto py-4 md:py-8">
          <blockquote className="text-2xl md:text-4xl font-bold leading-snug tracking-tight">“{block.text}”</blockquote>
          {block.cite && <figcaption className="mt-4 text-sm" style={{ color: "var(--ed-dim)" }}>— {block.cite}</figcaption>}
        </figure>
      );
    case "IMAGE": {
      const img = resolveImage(block.image);
      return (
        <figure className={block.wide ? "" : "max-w-[900px] mx-auto"}>
          <EdImage image={img} ratio="3 / 2" sizes="(min-width: 768px) 900px, 100vw" />
          {img.caption && <figcaption className="mt-2 text-xs" style={{ color: "var(--ed-dim)" }}>{img.caption}</figcaption>}
        </figure>
      );
    }
    case "IMAGE_GALLERY":
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
          {block.images.map((ref, i) => (
            <EdImage key={i} image={resolveImage(ref)} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 50vw" />
          ))}
        </div>
      );
    case "IMAGE_TEXT": {
      const img = resolveImage(block.image);
      return (
        <div className={`max-w-[900px] mx-auto grid md:grid-cols-2 gap-6 md:gap-10 items-center ${block.reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
          <EdImage image={img} ratio="4 / 5" sizes="(min-width: 768px) 450px, 100vw" />
          <p className="text-base leading-[1.85]">{block.text}</p>
        </div>
      );
    }
    case "QNA":
      return (
        <dl className={`${READ} space-y-6`}>
          {block.items.map((item, i) => (
            <div key={i} className="space-y-2">
              <dt className="text-base font-bold leading-snug">Q. {item.q}</dt>
              <dd className="text-base leading-[1.85]" style={{ color: "#333" }}>{item.a}</dd>
            </div>
          ))}
        </dl>
      );
    case "SPACE_CARD": {
      const space = getSpace(block.spaceSlug);
      if (!space) return null;
      const meta = [space.area, space.category].filter(Boolean).join(" · ");
      return (
        <Link href={spaceHref(space.slug)} className="group max-w-[900px] mx-auto grid grid-cols-[112px_1fr] md:grid-cols-[280px_1fr] gap-5 md:gap-10 items-center">
          <EdImage
            image={spaceCoverImage(space)}
            ratio="4 / 5"
            sizes="(min-width: 768px) 280px, 112px"
          />
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>SPACE</p>
            <p className="text-lg md:text-2xl font-bold leading-snug group-hover:underline underline-offset-4">{space.name}</p>
            {meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{meta}</p>}
            {(block.note ?? space.summary) && (
              <p className="text-sm md:text-base leading-relaxed pt-1">{block.note ?? space.summary}</p>
            )}
            <p className="text-xs pt-1" style={{ color: "var(--ed-dim)" }}>공간 보기 →</p>
          </div>
        </Link>
      );
    }
  }
}
