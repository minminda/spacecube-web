import StoryCard, { INDEX_GRID_SIZES } from "./StoryCard";
import { formatCurationNumber, type CurationView } from "@/lib/editorial/types";

/** 큐레이션 카드 — 대표 이미지 · 지역(없으면 번호) · 제목 · 한 줄 기준. 포함 공간 목록은 상세에서. */
export default function CurationCard({ c, ratio = "1 / 1", sizes = INDEX_GRID_SIZES, priority }: { c: CurationView; ratio?: string; sizes?: string; priority?: boolean }) {
  return (
    <StoryCard
      href={`/curation/${c.slug}`}
      image={c.cover}
      eyebrow={c.area ?? formatCurationNumber(c.number)}
      title={c.title}
      line={c.summary}
      ratio={ratio}
      sizes={sizes}
      priority={priority}
    />
  );
}
