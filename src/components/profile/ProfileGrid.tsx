import SaveButton from "@/components/editorial/SaveButton";
import SpaceTile, { SPACE_GRID_CLASS, SPACE_GRID_SIZES } from "@/components/editorial/SpaceTile";
import type { PublicSpaceCard } from "@/lib/profile/profileData";

/**
 * 공개 프로필의 사진 그리드 — 내 아카이브와 같은 공간 카드(SpaceTile)와 그리드. 텍스트는 공간명 · 지역만(태그·평점·통계 없음).
 * 사진은 그 사람이 공개한 자기 사진이 우선, 없으면 공간 대표 사진(같은 공간도 사람마다 다른 시선).
 * 카드를 누르면 공개 기록(/@handle/s/slug), 저장은 기존 저장(같은 canonical 공간 id — 공간 복제 없음).
 */
export default function ProfileGrid({ handle, cards, savedIds, loggedIn, common, priorityFirst }: {
  handle: string;
  cards: PublicSpaceCard[];
  savedIds: Set<string>;
  loggedIn: boolean;
  /** 나도 아카이브에 담은 공간 id(보는 사람 기준) — 아주 작게 표시 */
  common?: Set<string>;
  priorityFirst?: boolean;
}) {
  return (
    <ul className={SPACE_GRID_CLASS}>
      {cards.map((c, i) => (
        <li key={c.space.id} className="min-w-0">
          <SpaceTile
            href={`/@${handle}/s/${c.space.slug}`}
            image={{ src: c.photo, alt: c.photoIsMine ? `${c.space.name} — 직접 찍은 사진` : c.space.name, position: c.photoIsMine ? undefined : c.space.coverPosition }}
            name={c.space.name}
            meta={[c.space.area, common?.has(c.space.id) ? "나도 담은 곳" : null].filter(Boolean).join(" · ")}
            sizes={SPACE_GRID_SIZES}
            priority={priorityFirst && i < 4}
            action={<SaveButton spaceId={c.space.id} spaceName={c.space.name} initialSaved={savedIds.has(c.space.id)} loggedIn={loggedIn} />}
          />
        </li>
      ))}
    </ul>
  );
}
