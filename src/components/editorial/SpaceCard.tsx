import Link from "next/link";
import EdImage from "./EdImage";
import type { EditorialSpace } from "@/lib/editorial";

interface Props {
  space: EditorialSpace;
  ratio?: string;
  sizes?: string;
  /** 카드 아래 한 줄(큐레이션 메모 등) — 없으면 표시하지 않는다 */
  note?: string;
  showTagline?: boolean;
}

/** 공간 카드 — 이미지 · 공간명 · 지역 · 공간 유형. 기존 공간 상세(/space/[slug])로 연결한다. */
export default function SpaceCard({ space, ratio = "4 / 5", sizes = "(min-width: 768px) 33vw, 80vw", note, showTagline }: Props) {
  const meta = [space.district, space.typeLabel].filter(Boolean).join(" · ");
  return (
    <Link href={`/space/${space.slug}`} className="group block">
      <EdImage
        image={{ src: space.imageUrl, alt: space.name, position: `${space.imagePositionX * 100}% ${space.imagePositionY * 100}%` }}
        ratio={ratio}
        sizes={sizes}
      />
      <div className="pt-3 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold leading-snug group-hover:underline underline-offset-4">{space.name}</p>
          {space.hasCube && (
            <span className="ed-label shrink-0" style={{ color: "var(--ed-dim)", fontSize: 10 }}>CUBE</span>
          )}
        </div>
        {meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{meta}</p>}
        {showTagline && space.tagline && (
          <p className="text-sm leading-relaxed pt-1" style={{ color: "var(--ed-dim)" }}>{space.tagline}</p>
        )}
        {note && <p className="text-sm leading-relaxed pt-1">{note}</p>}
      </div>
    </Link>
  );
}
