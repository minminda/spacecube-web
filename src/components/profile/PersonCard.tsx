import Link from "next/link";
import EdImage from "@/components/editorial/EdImage";
import type { PersonCard as PersonCardData } from "@/lib/profile/profileData";
import { profilePath } from "@/lib/profile/publicProfile";
import { FollowTasteButton } from "./ProfileActions";

/** 이름 첫 글자 칸 — 프로필 사진이 없을 때(원형 아바타·스토리 링 같은 SNS 표현은 쓰지 않는다). */
export function Initial({ name, image, size }: { name: string; image: string | null; size: number }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- 로그인 제공자 프로필 이미지(외부 도메인)
    <img src={image} alt="" width={size} height={size} className="shrink-0 object-cover" style={{ width: size, height: size, background: "var(--ed-soft)" }} />
  ) : (
    <span aria-hidden className="shrink-0 inline-flex items-center justify-center font-bold" style={{ width: size, height: size, background: "var(--ed-soft)", fontSize: size * 0.42 }}>
      {name.replace(/^@/, "").slice(0, 1)}
    </span>
  );
}

/**
 * 사람 카드(사람 찾기 · 관계 목록) — 이름 · 소개 · 최근 공개 공간 사진 2~3장 · 취향 따라가기.
 * 태그·취향 통계 없이 사진으로 "이 사람이 어떤 공간을 좋아하는지"를 먼저 느끼게 한다.
 */
export default function PersonCard({ p, following, loggedIn, self, returnTo }: { p: PersonCardData; following: boolean; loggedIn: boolean; self: boolean; returnTo?: string }) {
  const href = profilePath(p.handle);
  return (
    <article className="py-6 md:py-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-10 md:items-center" style={{ borderBottom: "1px solid var(--ed-line)" }}>
      <div className="flex items-start gap-4 min-w-0">
        <Link href={href} aria-label={`${p.name}의 공개 프로필`}><Initial name={p.name} image={p.image} size={52} /></Link>
        <div className="min-w-0 space-y-1.5">
          <Link href={href} className="block text-lg md:text-xl font-bold tracking-tight truncate hover:underline underline-offset-4">{p.name}</Link>
          {p.bio && <p className="text-sm leading-relaxed break-keep line-clamp-2" style={{ color: "var(--ed-dim)" }}>{p.bio}</p>}
          <div className="pt-1.5">
            {self ? (
              <span className="text-xs" style={{ color: "var(--ed-dim)" }}>나</span>
            ) : (
              <FollowTasteButton handle={p.handle} initialFollowing={following} loggedIn={loggedIn} size="sm" returnTo={returnTo} />
            )}
          </div>
        </div>
      </div>
      {p.photos.length > 0 ? (
        <Link href={href} className="grid grid-cols-3 gap-1.5" aria-label={`${p.name}이(가) 공개한 공간`}>
          {p.photos.map((ph, i) => (
            <EdImage key={i} image={{ src: ph.url, alt: ph.name }} ratio="1 / 1" sizes="(min-width: 768px) 18vw, 30vw" />
          ))}
        </Link>
      ) : (
        <p className="text-xs" style={{ color: "var(--ed-dim)" }}>아직 공개한 공간이 없어요.</p>
      )}
    </article>
  );
}
