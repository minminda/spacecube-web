import Link from "next/link";
import EdImage from "./EdImage";
import { resolveImage, type EditorialSpace } from "@/lib/editorial";
import type { ContentBlock } from "@/content/types";

/** 블록 본문이 참조하는 모든 공간 slug(SPACE_CARD + 공간 사진) — 페이지가 한 번에 조회하도록 모은다. */
export function collectBlockSpaceSlugs(blocks: ContentBlock[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "SPACE_CARD") out.push(b.spaceSlug);
    if (b.type === "IMAGE" || b.type === "IMAGE_TEXT") if (b.image.spaceSlug) out.push(b.image.spaceSlug);
    if (b.type === "IMAGE_GALLERY") for (const i of b.images) if (i.spaceSlug) out.push(i.spaceSlug);
  }
  return out;
}

interface Props {
  blocks: ContentBlock[];
  spaces: Map<string, EditorialSpace>;
}

/** 에디토리얼 본문 블록 렌더러 — 텍스트는 읽기 폭(640px), 이미지는 넓게 써서 리듬을 만든다. */
export default function BlockRenderer({ blocks, spaces }: Props) {
  return (
    <div className="space-y-10 md:space-y-14">
      {blocks.map((block, i) => (
        <Block key={i} block={block} spaces={spaces} />
      ))}
    </div>
  );
}

const READ = "max-w-[640px] mx-auto";

function Block({ block, spaces }: { block: ContentBlock; spaces: Map<string, EditorialSpace> }) {
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
      const img = resolveImage(block.image, spaces);
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
            <EdImage key={i} image={resolveImage(ref, spaces)} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 50vw" />
          ))}
        </div>
      );
    case "IMAGE_TEXT": {
      const img = resolveImage(block.image, spaces);
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
      const space = spaces.get(block.spaceSlug);
      if (!space) return null;
      const meta = [space.district, space.typeLabel].filter(Boolean).join(" · ");
      return (
        <Link href={`/space/${space.slug}`} className="group max-w-[900px] mx-auto grid grid-cols-[112px_1fr] md:grid-cols-[280px_1fr] gap-5 md:gap-10 items-center">
          <EdImage
            image={{ src: space.imageUrl, alt: space.name, position: `${space.imagePositionX * 100}% ${space.imagePositionY * 100}%` }}
            ratio="4 / 5"
            sizes="(min-width: 768px) 280px, 112px"
          />
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>SPACE</p>
            <p className="text-lg md:text-2xl font-bold leading-snug group-hover:underline underline-offset-4">{space.name}</p>
            {meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{meta}</p>}
            {(block.note ?? space.tagline) && (
              <p className="text-sm md:text-base leading-relaxed pt-1">{block.note ?? space.tagline}</p>
            )}
            <p className="text-xs pt-1" style={{ color: "var(--ed-dim)" }}>공간 보기 →</p>
          </div>
        </Link>
      );
    }
  }
}
