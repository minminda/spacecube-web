import Link from "next/link";
import Shelf from "@/components/home/Shelf";
import UserAvatar from "@/components/profile/UserAvatar";
import { profilePath } from "@/lib/profile/publicProfile";
import type { SimilarPerson } from "@/lib/people/peopleData";

/**
 * HOME의 "취향이 비슷한 사람" — 아바타 + 이름뿐인 작은 줄. 팔로워 수 · 소개 · 점수는 없다.
 * SNS에서 사람을 팔로우하는 곳이 아니라, 취향이 비슷한 사람이 고른 공간을 둘러보는 입구다(이름을 누르면 그 사람이 공개한 공간).
 * 사람 검색 · 따라가기는 /find?tab=people에 그대로 있다.
 */
export default function SimilarPeopleShelf({ people }: { people: SimilarPerson[] }) {
  return (
    <Shelf id="similar-people" title="취향이 비슷한 사람" description="이 사람들이 고른 공간을 둘러보세요" href="/find?tab=people" cta="더 보기" kind="person">
      {people.map((p) => (
        <li key={p.handle}>
          <Link href={profilePath(p.handle)} className="group block min-w-0" aria-label={`${p.name} 프로필`}>
            <UserAvatar seed={p.avatarSeed} image={p.image} />
            <span className="block pt-2 text-xs md:text-[13px] font-semibold truncate group-hover:underline underline-offset-4">{p.name}</span>
          </Link>
        </li>
      ))}
    </Shelf>
  );
}
