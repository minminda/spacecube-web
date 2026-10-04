import StoryCard, { INDEX_GRID_SIZES } from "./StoryCard";
import { curationLabel, type CurationView } from "@/lib/editorial/types";

/** 큐레이션 카드 — 대표 이미지 · 번호/지역 · 제목 · 한 줄 기준. 포함 공간 목록은 상세에서. */
export default function CurationCard({ c, ratio = "1 / 1", mobileRatio, sizes = INDEX_GRID_SIZES, priority }: { c: CurationView; ratio?: string; mobileRatio?: string; sizes?: string; priority?: boolean }) {
  return (
    <StoryCard
      href={`/curation/${c.slug}`}
      image={c.cover}
      eyebrow={curationLabel(c)}
      title={c.title}
      line={c.summary}
      ratio={ratio}
      mobileRatio={mobileRatio}
      sizes={sizes}
      priority={priority}
    />
  );
}
