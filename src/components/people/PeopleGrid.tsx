import Link from "next/link";
import UserAvatar from "@/components/profile/UserAvatar";
import { profilePath } from "@/lib/profile/publicProfile";
import type { RecommendedPerson } from "@/lib/people/peopleData";

/** 사람 그리드 — 공간 그리드(SPACE_GRID_CLASS)와 같은 간격 · 리듬. 휴대폰 4명, 데스크톱 6명. */
export const PEOPLE_GRID_CLASS = "grid grid-cols-4 gap-x-1.5 gap-y-4 md:grid-cols-6 md:gap-x-6 md:gap-y-10";

const soft = { background: "var(--ed-soft)" } as const;

/**
 * 추천 > 사람 카드 — 아바타 · 닉네임 · @아이디 · 따라가는 취향 / 나를 따라가는 사람(공개 프로필과 같은 용어 · 숫자).
 * 소개 · 추천 이유 · 긴 설명은 넣지 않는다(휴대폰 4열에서 복잡해지지 않게). 화면 폭과 상관없이 같은 정보 구조.
 * 아바타 · 닉네임 · @아이디 → 공개 프로필, 관계 수 → 각 목록(/@handle/following · /followers). 점수 · 퍼센트 · 태그 없음.
 * 비공개 프로필은 이 그리드에 오지 않는다(추천 · 검색에서 제외) — 관계 목록 링크도 공개 프로필에만 생긴다.
 */
export function PersonTile({ p }: { p: RecommendedPerson }) {
  const path = profilePath(p.handle);
  return (
    <div className="min-w-0">
      <Link href={path} className="group block min-w-0" aria-label={`${p.name} 프로필`}>
        <UserAvatar seed={p.avatarSeed} image={p.image} />
        <p className="pt-2 md:pt-3 text-[13px] leading-[1.3] md:text-[15px] font-bold break-keep line-clamp-2 group-hover:underline underline-offset-4">{p.name}</p>
      </Link>
      <Link href={path} className="block truncate pt-0.5 text-[11px] md:text-[13px] leading-[1.35] hover:underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>
        @{p.handle}
      </Link>
      <p className="pt-1 text-[10px] md:text-xs leading-[1.4] break-keep tabular-nums" style={{ color: "var(--ed-dim)" }}>
        <Link href={`${path}/following`} className="block hover:underline underline-offset-4">따라가는 <span className="whitespace-nowrap">취향 {p.followingCount}</span></Link>
        {/* 휴대폰 4열에서 한 줄에 다 안 들어가면 "나를 따라가는 / 사람 N"으로 — 숫자만 다음 줄로 떨어지지 않게 */}
        <Link href={`${path}/followers`} className="block hover:underline underline-offset-4">나를 따라가는 <span className="whitespace-nowrap">사람 {p.followerCount}</span></Link>
      </p>
    </div>
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
          <div className="h-3 w-2/3" style={soft} />
          <div className="h-2.5 w-1/2" style={soft} />
        </div>
      ))}
    </div>
  );
}
