import StoryCard, { INDEX_GRID_SIZES } from "./StoryCard";
import { curationLabel, type CurationView } from "@/lib/editorial/types";

/**
 * 큐레이션 카드 — 대표 이미지 · 번호 · 지역 · 제목 · 한 줄 기준. 포함 공간 목록은 상세에서.
 * 큐레이션만 모인 곳(홈 CURATION · /curation)에서 쓰므로 유형은 빼고 "003 · 연남"으로 적는다.
 * 이미 지역을 고른 화면(/curation?area=연남)은 showArea={false}로 번호만.
 */
export default function CurationCard({ c, ratio = "1 / 1", sizes = INDEX_GRID_SIZES, priority, showArea = true }: { c: CurationView; ratio?: string; sizes?: string; priority?: boolean; showArea?: boolean }) {
  return (
    <StoryCard
      href={`/curation/${c.slug}`}
      image={c.cover}
      eyebrow={curationLabel(showArea ? c : { number: c.number }, false)}
      title={c.title}
      line={c.summary}
      ratio={ratio}
      sizes={sizes}
      priority={priority}
    />
  );
}
