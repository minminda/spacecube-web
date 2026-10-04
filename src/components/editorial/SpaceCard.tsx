import SaveButton from "./SaveButton";
import SpaceTile, { SPACE_GRID_SIZES } from "./SpaceTile";
import { spaceCoverImage, spaceHref, type SpaceView } from "@/lib/editorial/types";

export interface CardSaveState {
  saved: boolean;
  loggedIn: boolean;
}

interface Props {
  space: SpaceView;
  ratio?: string;
  mobileRatio?: string;
  sizes?: string;
  /** 카드 아래 한 줄(큐레이션 선정 이유 등) — 없으면 표시하지 않는다 */
  note?: string;
  /** 한 줄 소개를 note 자리에 보여준다(note가 없을 때만) */
  showSummary?: boolean;
  /** 저장 버튼 — 넘기지 않으면 표시하지 않는다(서버가 저장 상태를 알 때만) */
  save?: CardSaveState;
  /** 추천 이유 등 보조 문장(실제 데이터로 설명 가능한 경우에만 넘긴다) */
  reason?: string | null;
  priority?: boolean;
  /** grid(촘촘한 그리드, 기본) / feature(상세 하단 목록처럼 크게) */
  variant?: "grid" | "feature";
}

/**
 * 공개 SPACE 카드 — 공통 SpaceTile(사진 · 공간명 · 지역 · 한 줄 · 저장) 위에 공간 데이터를 얹는다.
 * 공개 SPACE 상세(/spaces/[slug])로만 연결한다. 별점·순위·평가 표현은 쓰지 않는다.
 */
export default function SpaceCard({ space, ratio, mobileRatio, sizes = SPACE_GRID_SIZES, note, showSummary, save, reason, priority, variant }: Props) {
  return (
    <SpaceTile
      href={spaceHref(space.slug)}
      image={spaceCoverImage(space)}
      name={space.name}
      meta={[space.area, space.isDemo ? "가상 공간" : null].filter(Boolean).join(" · ")}
      line={reason ?? (showSummary && !note ? space.summary : null)}
      note={note}
      partner={space.cubeAvailable}
      ratio={ratio}
      mobileRatio={mobileRatio}
      sizes={sizes}
      priority={priority}
      variant={variant}
      action={save && <SaveButton spaceId={space.id} spaceName={space.name} initialSaved={save.saved} loggedIn={save.loggedIn} variant="corner" />}
    />
  );
}
