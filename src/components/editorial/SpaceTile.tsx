import Link from "next/link";
import EdImage from "./EdImage";
import PartnerMark from "./PartnerMark";
import type { ResolvedImage } from "@/lib/editorial/types";

interface Props {
  href: string;
  image: ResolvedImage;
  name: string;
  /** 이름 아래 작은 한 줄 — 보통 지역(촘촘한 휴대폰 그리드에서는 숨긴다) */
  meta?: string | null;
  /** 그 아래 한 줄(추천 이유 등) — 휴대폰 그리드에서는 숨기고, 길면 한 줄에서 자른다 */
  line?: string | null;
  /** 잘리지 않는 문단(큐레이션의 공간별 선정 이유처럼 카드의 핵심 문장) */
  note?: string | null;
  partner?: boolean;
  /** 사진 오른쪽 위 모서리의 작은 행동(저장) — 링크 밖에 둔다(링크 안 버튼은 잘못된 HTML) */
  action?: React.ReactNode;
  sizes: string;
  priority?: boolean;
  ratio?: string;
  /** 휴대폰에서만 쓰는 비율 */
  mobileRatio?: string;
  /**
   * grid: 촘촘한 그리드(휴대폰 4열) — 휴대폰에서는 사진 · 이름만, 768px부터 지역 · 한 줄까지.
   * feature: 상세 하단의 공간 목록처럼 한 장씩 크게 보는 곳 — 모든 폭에서 같은 크기.
   */
  variant?: "grid" | "feature";
}

/**
 * 공간 카드의 공통 모양 — 추천 · 내 아카이브 · 공개 프로필 · 큐레이션/스토리의 공간 · 함께한 공간이 모두 이 틀을 쓴다.
 * 데스크톱 카드를 기준으로 휴대폰에서는 크기와 간격만 줄인다(같은 4:5 사진 · 같은 구조).
 * 저장은 사진 모서리의 작은 아이콘(보이는 아이콘은 작게, 누르는 영역은 40px).
 */
export default function SpaceTile({ href, image, name, meta, line, note, partner, action, sizes, priority, ratio = "4 / 5", mobileRatio, variant = "grid" }: Props) {
  const grid = variant === "grid";
  return (
    <div className="group relative min-w-0">
      <Link href={href} className="block" tabIndex={-1} aria-hidden>
        <EdImage image={image} ratio={ratio} mobileRatio={mobileRatio} sizes={sizes} priority={priority} />
      </Link>
      {action && <div className="absolute right-0 top-0 z-10">{action}</div>}
      <Link href={href} className={`block min-w-0 ${grid ? "pt-1.5 md:pt-2.5" : "pt-2.5"}`}>
        <span className="flex items-baseline gap-1">
          <span className={`font-semibold break-keep line-clamp-2 group-hover:underline underline-offset-4 ${grid ? "text-[11px] leading-[1.3] md:text-[15px] md:leading-snug" : "text-[15px] leading-snug"}`}>{name}</span>
          {partner && <span className={grid ? "hidden md:inline" : ""}><PartnerMark size={13} /></span>}
        </span>
        {meta && <span className={`${grid ? "hidden md:block" : "block"} pt-0.5 text-xs truncate`} style={{ color: "var(--ed-dim)" }}>{meta}</span>}
        {line && (
          <span className={`${grid ? "hidden md:block" : "block"} pt-1`}>
            <span className="text-xs leading-snug line-clamp-1">{line}</span>
          </span>
        )}
      </Link>
      {note && <p className="pt-2 text-sm leading-relaxed break-keep">{note}</p>}
    </div>
  );
}

/** 공간 그리드 — 데스크톱 기준 4열을 휴대폰에서도 4열로(간격만 줄인다) */
export const SPACE_GRID_CLASS = "grid grid-cols-4 gap-x-1.5 gap-y-4 md:gap-x-6 md:gap-y-10";
/** 위 그리드에 맞는 next/image sizes — 휴대폰 한 칸 ≈ 25vw, 데스크톱은 컨테이너 1200px 기준 한 칸 ≈ 280px */
export const SPACE_GRID_SIZES = "(min-width: 1200px) 280px, 25vw";
