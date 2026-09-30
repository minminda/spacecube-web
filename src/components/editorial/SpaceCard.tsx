import Link from "next/link";
import EdImage from "./EdImage";
import { spaceCoverImage, spaceHref } from "@/content/spaces";
import type { EditorialSpace } from "@/content/types";

interface Props {
  space: EditorialSpace;
  ratio?: string;
  sizes?: string;
  /** 카드 아래 한 줄(큐레이션 메모 등) — 없으면 표시하지 않는다 */
  note?: string;
  showSummary?: boolean;
}

/** 홈페이지 SPACE 카드 — 이미지 · 공간명 · 지역 · 종류. 공개 SPACE 상세(/spaces/[slug])로만 연결한다. */
export default function SpaceCard({ space, ratio = "4 / 5", sizes = "(min-width: 768px) 33vw, 80vw", note, showSummary }: Props) {
  const meta = [space.area, space.category].filter(Boolean).join(" · ");
  return (
    <Link href={spaceHref(space.slug)} className="group block">
      <EdImage image={spaceCoverImage(space)} ratio={ratio} sizes={sizes} />
      <div className="pt-3 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold leading-snug group-hover:underline underline-offset-4">{space.name}</p>
          {space.cubeAvailable && (
            <span className="ed-label shrink-0" style={{ color: "var(--ed-dim)", fontSize: 10 }} title="GONGGANCUBE가 있는 공간">CUBE</span>
          )}
        </div>
        {meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{meta}</p>}
        {showSummary && space.summary && (
          <p className="text-sm leading-relaxed pt-1" style={{ color: "var(--ed-dim)" }}>{space.summary}</p>
        )}
        {note && <p className="text-sm leading-relaxed pt-1">{note}</p>}
      </div>
    </Link>
  );
}
