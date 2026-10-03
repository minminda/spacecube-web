import Link from "next/link";
import EdImage from "./EdImage";
import PartnerMark from "./PartnerMark";
import SaveButton from "./SaveButton";
import { spaceCoverImage, spaceHref, type SpaceView } from "@/lib/editorial/types";

export interface CardSaveState {
  saved: boolean;
  loggedIn: boolean;
}

interface Props {
  space: SpaceView;
  ratio?: string;
  sizes?: string;
  /** 카드 아래 한 줄(큐레이션 메모 등) — 없으면 표시하지 않는다 */
  note?: string;
  showSummary?: boolean;
  /** 저장 버튼 — 넘기지 않으면 표시하지 않는다(서버가 저장 상태를 알 때만) */
  save?: CardSaveState;
  /** 추천 이유 등 보조 문장(실제 데이터로 설명 가능한 경우에만 넘긴다) */
  reason?: string;
}

/**
 * 홈페이지 SPACE 카드 — 이미지 · 공간명 · 지역 · 종류 · 한 줄 소개 · 저장 · (함께한 공간이면) 큐브 표시.
 * 공개 SPACE 상세(/spaces/[slug])로만 연결한다. 저장 버튼은 링크 밖에 둔다(링크 안 버튼은 잘못된 HTML).
 * 별점·순위·평가 표현은 쓰지 않는다.
 */
export default function SpaceCard({ space, ratio = "4 / 5", sizes = "(min-width: 768px) 33vw, 80vw", note, showSummary, save, reason }: Props) {
  const meta = [space.area, space.category].filter(Boolean).join(" · ");
  const href = spaceHref(space.slug);
  return (
    <div className="group">
      <Link href={href} className="block" tabIndex={-1} aria-hidden>
        <EdImage image={spaceCoverImage(space)} ratio={ratio} sizes={sizes} />
      </Link>
      <div className="pt-3 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0 flex items-baseline gap-2">
            <span className="text-base font-semibold leading-snug group-hover:underline underline-offset-4">{space.name}</span>
            {space.cubeAvailable && <PartnerMark size={14} />}
          </Link>
          {save && <SaveButton spaceId={space.id} spaceName={space.name} initialSaved={save.saved} loggedIn={save.loggedIn} />}
        </div>
        {meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{meta}</p>}
        {showSummary && space.summary && (
          <p className="text-sm leading-relaxed pt-1" style={{ color: "var(--ed-dim)" }}>{space.summary}</p>
        )}
        {note && <p className="text-sm leading-relaxed pt-1">{note}</p>}
        {reason && <p className="text-xs leading-relaxed pt-1">{reason}</p>}
      </div>
    </div>
  );
}
