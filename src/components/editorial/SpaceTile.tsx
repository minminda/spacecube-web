import Link from "next/link";
import EdImage from "./EdImage";
import PartnerMark from "./PartnerMark";
import type { ResolvedImage } from "@/lib/editorial/types";

interface Props {
  href: string;
  image: ResolvedImage;
  name: string;
  /** 이름 아래 작은 한 줄 — 보통 지역 */
  meta?: string | null;
  /** 그 아래 한 줄(추천 이유 · 선정 이유 등) — 길면 한 줄에서 자른다 */
  line?: string | null;
  /** 잘리지 않는 문단(큐레이션의 공간별 선정 이유처럼 카드의 핵심 문장) */
  note?: string | null;
  partner?: boolean;
  /** 이름 오른쪽 작은 행동(저장 아이콘 등) — 링크 밖에 둔다(링크 안 버튼은 잘못된 HTML) */
  action?: React.ReactNode;
  sizes: string;
  priority?: boolean;
  ratio?: string;
  /** 휴대폰에서만 쓰는 비율(1열 목록에서 사진이 한 화면을 다 차지하지 않게) */
  mobileRatio?: string;
}

/**
 * 공간 카드의 공통 모양 — 추천 · 내 아카이브 · 공개 프로필 · 큐레이션/스토리의 공간 · 함께한 공간이 모두 이 틀을 쓴다.
 * 사진(4:5) · 공간명(최대 두 줄) · 지역 · (선택) 한 줄. 유형·태그·주소·외부 링크는 카드에 두지 않는다(상세에서).
 * 그리드 규칙: 휴대폰 2열 · 태블릿 3열 · 데스크톱 4열, gap은 SPACE_GRID_CLASS 하나로.
 */
export default function SpaceTile({ href, image, name, meta, line, note, partner, action, sizes, priority, ratio = "4 / 5", mobileRatio }: Props) {
  return (
    <div className="group min-w-0">
      <Link href={href} className="block" tabIndex={-1} aria-hidden>
        <EdImage image={image} ratio={ratio} mobileRatio={mobileRatio} sizes={sizes} priority={priority} />
      </Link>
      <div className="pt-2.5 flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold leading-snug line-clamp-2 break-keep group-hover:underline underline-offset-4">{name}</span>
            {partner && <PartnerMark size={13} />}
          </span>
          {meta && <span className="block pt-0.5 text-xs truncate" style={{ color: "var(--ed-dim)" }}>{meta}</span>}
          {line && <span className="pt-1 text-xs leading-snug line-clamp-1" style={{ color: "var(--ed-fg)" }}>{line}</span>}
        </Link>
        {action}
      </div>
      {note && <p className="pt-2 text-sm leading-relaxed break-keep">{note}</p>}
    </div>
  );
}

/** 공간 그리드 공통 간격 — 휴대폰 2열 · 태블릿 3열 · 데스크톱 4열 */
export const SPACE_GRID_CLASS = "grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4";
/** 위 그리드에 맞는 next/image sizes */
export const SPACE_GRID_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";
