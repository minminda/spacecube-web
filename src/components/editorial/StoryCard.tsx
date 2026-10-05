import Link from "next/link";
import EdImage from "./EdImage";

interface Props {
  href: string;
  image: { src: string | null; alt: string; position?: string };
  /**
   * 메타 한 줄 — 위치가 유형을 알려 주면 번호부터("001", "003 · 연남"),
   * 여러 유형이 섞인 목록에서만 유형을 한 번("PEOPLE 001", "THOUGHT 002 · 장면").
   */
  eyebrow: string;
  title: string;
  /** 한 줄 — 768px부터만(휴대폰 3열에서는 이미지 · 라벨 · 제목만) */
  line?: string | null;
  ratio: string;
  sizes: string;
  priority?: boolean;
}

/**
 * STORY · CURATION 공용 인덱스 카드 — 대표 이미지 · 라벨 · 제목(최대 두 줄) · 한 줄.
 * 목록(/story, /curation), 홈 미리보기, 상세 하단 "다른 이야기"가 모두 이 카드 하나를 쓴다.
 * 데스크톱 3열 카드를 휴대폰에서도 3열로 — 같은 비율 · 같은 구조, 글자와 간격만 줄인다.
 * 둘의 차이는 비율(STORY 4:5 세로 · CURATION 1:1)과 라벨뿐.
 */
export default function StoryCard({ href, image, eyebrow, title, line, ratio, sizes, priority }: Props) {
  return (
    <Link href={href} className="group block min-w-0">
      <EdImage image={image} ratio={ratio} sizes={sizes} priority={priority} />
      <p className="ed-meta pt-1.5 md:pt-3 truncate">{eyebrow}</p>
      <p className="pt-0.5 md:pt-1.5 text-[12px] leading-[1.35] md:text-xl md:leading-snug font-bold tracking-[-0.02em] break-keep line-clamp-2 group-hover:underline underline-offset-4">{title}</p>
      {line && (
        <span className="hidden md:block pt-1">
          <span className="text-sm leading-relaxed line-clamp-1" style={{ color: "var(--ed-dim)" }}>{line}</span>
        </span>
      )}
    </Link>
  );
}

/** STORY · CURATION 목록 그리드 — 데스크톱 3열을 휴대폰에서도 3열로(간격만 줄인다) */
export const INDEX_GRID_CLASS = "grid grid-cols-3 gap-x-2 gap-y-6 md:gap-x-8 md:gap-y-14";
/** 위 그리드에 맞는 next/image sizes — 휴대폰 한 칸 ≈ 33vw, 데스크톱 컨테이너 1200px 기준 ≈ 380px */
export const INDEX_GRID_SIZES = "(min-width: 1200px) 380px, 33vw";
