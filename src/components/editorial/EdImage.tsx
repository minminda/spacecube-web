import Image from "next/image";
import CubeGlyph from "@/components/CubeGlyph";
import type { ResolvedImage } from "@/lib/editorial/types";

interface Props {
  image: ResolvedImage;
  /** CSS aspect-ratio, 예: "4 / 5" */
  ratio: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** 에디토리얼 공용 이미지 — 사진이 아직 없으면 라이트 그레이 면 + 큐브 도형 플레이스홀더. */
export default function EdImage({ image, ratio, sizes, priority, className }: Props) {
  return (
    <div className={`relative w-full overflow-hidden ${className ?? ""}`} style={{ aspectRatio: ratio, background: "var(--ed-soft)" }}>
      {image.src ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          style={{ objectPosition: image.position ?? "50% 50%" }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: "#c4c4c4" }}>
            <CubeGlyph outlineWidth={0.9} edgeWidth={0.8} />
          </svg>
        </div>
      )}
    </div>
  );
}
