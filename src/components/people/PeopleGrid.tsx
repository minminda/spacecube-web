import Link from "next/link";
import UserAvatar from "@/components/profile/UserAvatar";
import { profilePath } from "@/lib/profile/publicProfile";
import type { RecommendedPerson } from "@/lib/people/peopleData";

/** 사람 그리드 — 공간 그리드(SPACE_GRID_CLASS)와 같은 간격 · 리듬. 휴대폰 4명, 데스크톱 6명. */
export const PEOPLE_GRID_CLASS = "grid grid-cols-4 gap-x-1.5 gap-y-4 md:grid-cols-6 md:gap-x-6 md:gap-y-10";

const soft = { background: "var(--ed-soft)" } as const;

/**
 * 추천 > 사람 카드 — 아바타 · 이름만(휴대폰). 데스크톱(768px~)에서만 짧은 이유 한 줄.
 * 카드 전체가 공개 프로필로 가는 링크다. 따라가기 버튼은 카드에 두지 않는다(프로필에서) — 화면 폭마다 행동이 달라지지 않게.
 * 점수 · 퍼센트 · 태그는 보여주지 않는다.
 */
export function PersonTile({ p }: { p: RecommendedPerson }) {
  return (
    <Link href={profilePath(p.handle)} className="group block min-w-0" aria-label={`${p.name} 프로필`}>
      <UserAvatar seed={p.avatarSeed} image={p.image} />
      <p className="pt-1.5 md:pt-3 text-[11px] leading-[1.35] md:text-sm font-semibold break-keep line-clamp-2 group-hover:underline underline-offset-4">{p.name}</p>
      {p.reason && (
        <span className="hidden md:block pt-1">
          <span className="text-xs leading-relaxed line-clamp-1" style={{ color: "var(--ed-dim)" }}>{p.reason}</span>
        </span>
      )}
    </Link>
  );
}

export function PeopleGrid({ people }: { people: RecommendedPerson[] }) {
  return (
    <ul className={PEOPLE_GRID_CLASS}>
      {people.map((p) => (
        <li key={p.handle} className="min-w-0">
          <PersonTile p={p} />
        </li>
      ))}
    </ul>
  );
}

/** 사람 그리드 로딩 — 같은 자리에 정사각형 회색 면 + 이름 줄(움직임 없음). */
export function PeopleGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={PEOPLE_GRID_CLASS} aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="aspect-square" style={soft} />
          <div className="h-2.5 w-1/2" style={soft} />
        </div>
      ))}
    </div>
  );
}
