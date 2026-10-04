import Link from "next/link";
import EdImage from "./EdImage";

interface Props {
  href: string;
  image: { src: string | null; alt: string; position?: string };
  /** PEOPLE 001 · THOUGHT 002 / CURATION 001 · 연남 */
  eyebrow: string;
  title: string;
  /** 한 줄만 — 목록에서 긴 요약 전체를 보여주지 않는다 */
  line?: string | null;
  ratio: string;
  /** 휴대폰 비율 — 1열 목록에서 한 편이 화면 전체를 차지하지 않게 낮게 */
  mobileRatio?: string;
  sizes: string;
  priority?: boolean;
}

/**
 * STORY · CURATION 공용 인덱스 카드 — 대표 이미지 · 라벨 · 제목(최대 두 줄) · 한 줄.
 * 목록(/story, /curation), 홈 미리보기, 상세 하단 "다른 이야기"가 모두 이 카드 하나를 쓴다.
 * 둘의 차이는 비율(STORY 4:5 세로 · CURATION 1:1)과 라벨뿐, 타이포 · 여백 · 그리드는 같다.
 */
export default function StoryCard({ href, image, eyebrow, title, line, ratio, mobileRatio = "3 / 2", sizes, priority }: Props) {
  return (
    <Link href={href} className="group block min-w-0">
      <EdImage image={image} ratio={ratio} mobileRatio={mobileRatio} sizes={sizes} priority={priority} />
      <p className="pt-3 ed-label truncate" style={{ color: "var(--ed-dim)" }}>{eyebrow}</p>
      <p className="pt-1.5 text-lg md:text-xl font-bold leading-snug tracking-[-0.02em] break-keep line-clamp-2 group-hover:underline underline-offset-4">{title}</p>
      {line && <p className="pt-1 text-sm leading-relaxed line-clamp-1" style={{ color: "var(--ed-dim)" }}>{line}</p>}
    </Link>
  );
}

/** STORY · CURATION 목록 그리드 — 휴대폰 1열 · 태블릿 2열 · 데스크톱 3열 */
export const INDEX_GRID_CLASS = "grid gap-y-10 md:grid-cols-2 md:gap-x-8 md:gap-y-14 lg:grid-cols-3";
export const INDEX_GRID_SIZES = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";
