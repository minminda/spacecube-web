import Link from "next/link";
import EdImage from "@/components/editorial/EdImage";
import SaveButton from "@/components/editorial/SaveButton";
import type { PublicSpaceCard } from "@/lib/profile/profileData";

/**
 * 공개 프로필의 사진 그리드 — 사진이 UI보다 먼저 보이게. 텍스트는 공간명 · 지역만(태그·평점·통계 없음).
 * 사진은 그 사람이 공개한 자기 사진이 우선, 없으면 공간 대표 사진(같은 공간도 사람마다 다른 시선).
 * 카드를 누르면 공개 기록(/@handle/s/slug), 저장은 기존 저장(같은 canonical 공간 id — 공간 복제 없음).
 * 모바일 2열 · 데스크톱 3열.
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
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-14">
      {cards.map((c, i) => (
        <li key={c.space.id} className="min-w-0">
          <Link href={`/@${handle}/s/${c.space.slug}`} className="group block">
            <EdImage
              image={{ src: c.photo, alt: c.photoIsMine ? `${c.space.name} — 직접 찍은 사진` : c.space.name, position: c.photoIsMine ? undefined : c.space.coverPosition }}
              ratio="4 / 5"
              sizes="(min-width: 768px) 33vw, 50vw"
              priority={priorityFirst && i < 2}
            />
          </Link>
          <div className="pt-3 flex items-start justify-between gap-2">
            <Link href={`/@${handle}/s/${c.space.slug}`} className="min-w-0 group">
              <p className="text-[15px] md:text-base font-semibold leading-snug truncate group-hover:underline underline-offset-4">{c.space.name}</p>
              <p className="pt-0.5 text-xs truncate" style={{ color: "var(--ed-dim)" }}>
                {c.space.area}
                {common?.has(c.space.id) && <span> · 나도 담은 곳</span>}
              </p>
            </Link>
            <SaveButton spaceId={c.space.id} spaceName={c.space.name} initialSaved={savedIds.has(c.space.id)} loggedIn={loggedIn} />
          </div>
        </li>
      ))}
    </ul>
  );
}
