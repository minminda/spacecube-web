import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import { FollowTasteButton, ShareProfileButton } from "@/components/profile/ProfileActions";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getPublicProfile, viewerContext, type PublicSpaceCard } from "@/lib/profile/profileData";
import { normalizeHandle, profilePath } from "@/lib/profile/publicProfile";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${normalizeHandle(decodeURIComponent(handle))}의 공간 취향 — 공간큐브`, robots: { index: false } };
}

function thumb(url: string) {
  return url.includes("/image/upload/") ? url.replace("/image/upload/", "/image/upload/c_fill,w_200,h_200,q_auto,f_auto/") : url;
}

function SpaceGrid({ cards, savedIds, loggedIn, common }: { cards: PublicSpaceCard[]; savedIds: Set<string>; loggedIn: boolean; common: Set<string> }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
      {cards.map((c) => (
        <li key={c.space.id} className="min-w-0 space-y-2">
          {/* 저장은 기존 공간 저장(같은 canonical 공간 id) — 공간을 복제하지 않는다 */}
          <SpaceCard space={c.space} sizes="(min-width: 768px) 25vw, 50vw" save={{ saved: savedIds.has(c.space.id), loggedIn }} reason={common.has(c.space.id) ? "나도 아카이브에 담은 공간" : undefined} />
          {c.photos.length > 0 && (
            <div className="flex gap-1 overflow-x-auto ed-scroll-x">
              {c.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- 사용자가 공개를 허용한 방문 사진 썸네일
                <img key={p} src={thumb(p)} alt={`${c.space.name} 방문 사진 ${i + 1}`} className="shrink-0 w-14 h-14 object-cover" loading="lazy" />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * 공개 취향 프로필(/@handle → 이 페이지로 rewrite) — "이 사람이 어떤 공간을 좋아하고 발견하는지".
 * SNS가 아니다: 피드·좋아요·댓글·팔로워 수 없음. 공개한 공간 · 대표 취향 · 자주 찾는 지역 · 취향 따라가기 · 공유.
 * 비공개 프로필은 본인 외에는 404. 메모·방문 날짜·비공개 공간은 조회 단계부터 담지 않는다(profileData.ts).
 * 공개 정책은 다른 새 정보구조 화면과 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기).
 */
export default async function PublicTasteProfilePage({ params }: Props) {
  const [{ handle: raw }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) notFound();
  const handle = normalizeHandle(decodeURIComponent(raw));

  const p = await getPublicProfile(handle, viewer.userId, { curators: viewer.curators });
  if (!p) notFound();
  const self = viewer.userId === p.userId;
  const ctx = await viewerContext(viewer.userId, p);
  const common = new Set(ctx.comparison?.commonSpaceIds ?? []);
  const empty = p.visited.length === 0 && p.wantToGo.length === 0;

  return (
    <div className="editorial-bleed">
      {self && (
        <div style={{ background: p.isPublic ? "var(--ed-soft)" : "#fff6e6", borderBottom: "1px solid var(--ed-line)" }}>
          <p className="ed-container py-2.5 text-xs" style={{ color: p.isPublic ? "var(--ed-dim)" : "#8a5a00" }}>
            {p.isPublic ? "내 공개 프로필이에요 — 다른 사람에게 이렇게 보여요." : "아직 비공개예요 — 지금은 나에게만 보여요. 아카이브 설정에서 공개할 수 있어요."}
            <Link href="/archive" className="ml-3 underline underline-offset-4">내 아카이브로</Link>
          </p>
        </div>
      )}
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-8" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Taste Profile · @{p.handle}</p>
          <div className="pt-4 flex items-center gap-4">
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element -- 로그인 제공자 프로필 이미지(외부 도메인)
              <img src={p.image} alt="" className="w-14 h-14 md:w-16 md:h-16 object-cover shrink-0" style={{ background: "var(--ed-soft)" }} />
            )}
            <h1 className="text-[40px] md:text-[64px] font-bold leading-none tracking-[-0.04em] break-keep">{p.name}</h1>
          </div>
          {p.bio && <p className="pt-4 text-base md:text-lg leading-relaxed break-keep max-w-[640px]">{p.bio}</p>}
          {(p.tasteWords.length > 0 || p.areas.length > 0) && (
            <dl className="pt-5 grid gap-1.5 text-sm">
              {p.tasteWords.length > 0 && (
                <div className="flex gap-3"><dt className="w-20 shrink-0" style={{ color: "var(--ed-dim)" }}>대표 취향</dt><dd className="font-semibold">{p.tasteWords.join(" · ")}</dd></div>
              )}
              {p.areas.length > 0 && (
                <div className="flex gap-3"><dt className="w-20 shrink-0" style={{ color: "var(--ed-dim)" }}>자주 찾는 곳</dt><dd className="font-semibold">{p.areas.join(" · ")}</dd></div>
              )}
            </dl>
          )}

          <div className="pt-6 flex flex-wrap items-start gap-2">
            {!self && <FollowTasteButton handle={p.handle} initialFollowing={ctx.following} loggedIn={viewer.loggedIn} />}
            <ShareProfileButton path={profilePath(p.handle)} name={p.name} />
          </div>

          {ctx.comparison && (ctx.comparison.level !== "new" || ctx.comparison.commonSpaceIds.length > 0) && (
            <p className="pt-5 text-sm break-keep">
              <strong>{ctx.comparison.label}</strong>
              {ctx.comparison.sharedWords.length > 0 && <span style={{ color: "var(--ed-dim)" }}> · {ctx.comparison.sharedWords.join(" · ")}</span>}
              {ctx.comparison.commonSpaceIds.length > 0 && <span style={{ color: "var(--ed-dim)" }}> · 함께 좋아하는 공간 {ctx.comparison.commonSpaceIds.length}곳</span>}
            </p>
          )}
          {self && (
            <p className="pt-5 text-xs" style={{ color: "var(--ed-dim)" }}>
              <Link href="/archive/following" className="underline underline-offset-4">따라가는 취향 {p.followingCount}</Link>
            </p>
          )}
          {p.curatorSlug && (
            <p className="pt-3 text-sm"><Link href={`/curators/${p.curatorSlug}`} className="underline underline-offset-4">큐레이터 프로필과 컬렉션 보기 →</Link></p>
          )}
        </header>

        {empty ? (
          <p className="ed-container py-12 text-sm" style={{ color: "var(--ed-dim)" }}>{self ? "아직 공개한 공간이 없어요. 아카이브의 공간에서 “공개 프로필에 보이기”를 켜보세요." : "아직 공개한 공간이 없어요."}</p>
        ) : (
          <>
            {p.visited.length > 0 && (
              <section className="ed-container pt-10 md:pt-14">
                <div className="flex items-baseline justify-between pb-6">
                  <h2 className="text-xl md:text-[28px] font-bold tracking-[-0.03em]">다녀온 공간</h2>
                  <span className="text-xs" style={{ color: "var(--ed-dim)" }}>최근 기록 순 · {p.visited.length}곳</span>
                </div>
                <SpaceGrid cards={p.visited} savedIds={ctx.savedIds} loggedIn={viewer.loggedIn} common={common} />
              </section>
            )}
            {p.wantToGo.length > 0 && (
              <section className="ed-container pt-14 md:pt-20">
                <div className="flex items-baseline justify-between pb-6" style={{ borderTop: "1px solid var(--ed-line)" }}>
                  <h2 className="pt-10 text-xl md:text-[28px] font-bold tracking-[-0.03em]">가보고 싶은 공간</h2>
                  <span className="text-xs" style={{ color: "var(--ed-dim)" }}>{p.wantToGo.length}곳</span>
                </div>
                <SpaceGrid cards={p.wantToGo} savedIds={ctx.savedIds} loggedIn={viewer.loggedIn} common={common} />
              </section>
            )}
          </>
        )}
        <p className="ed-container pt-14 text-xs leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
          마음에 드는 공간은 저장하면 내 아카이브에 같은 공간으로 담겨요. 이 프로필에는 {p.name}님이 직접 공개한 공간과 취향만 보여요.
        </p>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
