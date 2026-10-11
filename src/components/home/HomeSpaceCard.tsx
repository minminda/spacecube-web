import Link from "next/link";
import EdImage from "@/components/editorial/EdImage";
import PartnerMark from "@/components/editorial/PartnerMark";
import SaveButton from "@/components/editorial/SaveButton";
import { spaceHref } from "@/lib/editorial/types";
import type { HomeSpace } from "@/lib/home/shelves";

export const HOME_SPACE_SIZES = "(min-width: 1024px) 220px, (min-width: 768px) 16vw, (min-width: 640px) 22vw, 31vw";

interface Props {
  space: HomeSpace;
  /** 왜 이 공간인가 — 추천 이유 · 큐레이션 선정 이유 · 한 줄 소개 중 하나(없으면 비운다) */
  reason?: string | null;
  /** 저장 버튼 — 서버가 저장 상태를 알 때만(임시 공간에는 없다) */
  save?: { saved: boolean; loggedIn: boolean };
  priority?: boolean;
}

/**
 * HOME 선반의 공간 카드 — 사진(없으면 플레이스홀더) · 공간명 · 지역 · 유형 · 이유 한 줄.
 * 별점 · 리뷰 수 · 순위 · 퍼센트는 넣지 않는다. 공개 SPACE 상세(/spaces/[slug])로 간다.
 * 임시(fixture) 공간은 상세가 없어 링크가 아니다.
 */
export default function HomeSpaceCard({ space, reason, save, priority }: Props) {
  const meta = [space.area, space.category].filter(Boolean).join(" · ");
  const body = (
    <>
      <span className="flex items-baseline gap-1 pt-1.5 md:pt-2">
        <span className="text-[13px] md:text-sm leading-snug font-semibold break-keep line-clamp-2 group-hover:underline underline-offset-4">{space.name}</span>
        {space.partner && <PartnerMark size={13} />}
      </span>
      {meta && <span className="block pt-0.5 text-[11px] md:text-xs truncate" style={{ color: "var(--ed-dim)" }}>{meta}</span>}
      {reason && <span className="block pt-1 text-[11px] md:text-xs leading-snug break-keep line-clamp-2">{reason}</span>}
    </>
  );

  return (
    <div className="group relative min-w-0">
      {space.slug ? (
        <>
          <Link href={spaceHref(space.slug)} className="block" tabIndex={-1} aria-hidden>
            <EdImage image={space.image} ratio="4 / 5" sizes={HOME_SPACE_SIZES} priority={priority} />
          </Link>
          {save && (
            <div className="absolute right-0 top-0 z-10">
              <SaveButton spaceId={space.id} spaceName={space.name} initialSaved={save.saved} loggedIn={save.loggedIn} variant="corner" />
            </div>
          )}
          <Link href={spaceHref(space.slug)} className="block min-w-0">{body}</Link>
        </>
      ) : (
        <div aria-label={`${space.name} (임시 카드)`}>
          <EdImage image={space.image} ratio="4 / 5" sizes={HOME_SPACE_SIZES} />
          <div className="min-w-0">{body}</div>
        </div>
      )}
    </div>
  );
}
