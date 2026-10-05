import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import ProfileGrid from "@/components/profile/ProfileGrid";
import { avatarSeed } from "@/lib/people/avatar";
import UserAvatar from "@/components/profile/UserAvatar";
import { ProfileFollowArea, RelationLine, ShareProfileButton } from "@/components/profile/ProfileActions";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { previewDemoUsers } from "@/lib/demoData";
import { getPrivateProfileStub, getPublicProfile, viewerContext } from "@/lib/profile/profileData";
import { normalizeHandle, profilePath } from "@/lib/profile/publicProfile";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${normalizeHandle(decodeURIComponent(handle))}의 공간 아카이브 — 공간큐브`, robots: { index: false } };
}

/**
 * 공개 프로필(/@handle → rewrite) — 이 사람이 고른 공간이 쌓인 개인 공간 매거진.
 * 취향은 숫자·태그로 설명하지 않는다: 대표 취향·태그 통계·자주 찾는 곳 같은 분석 문구 없이, 공개한 공간 사진이 곧 취향.
 * 상단: 이름 · 한 줄 소개 · 관계(작게) · [취향 따라가기][공유] (본인은 [공유]).
 * 비로그인도 볼 수 있다(공유 링크). 공개하지 않은 공간·사진·메모는 조회 단계부터 제외.
 * 비공개 프로필도 주소는 열린다 — 본인이 아니면 이름 · 아바타와 "비공개 아카이브입니다."만(내용은 조회하지 않는다).
 * 공개 정책은 다른 새 정보구조 화면과 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기).
 */
export default async function PublicProfilePage({ params }: Props) {
  const [{ handle: raw }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) notFound();
  const handle = normalizeHandle(decodeURIComponent(raw));

  const includeDemo = previewDemoUsers(viewer.admin);
  const p = await getPublicProfile(handle, viewer.userId, { curators: false, includeDemo });
  if (!p) {
    const stub = await getPrivateProfileStub(handle, { includeDemo });
    if (!stub) notFound();
    return (
      <div className="editorial-bleed">
        <main className="pb-24 md:pb-32">
          <header className="ed-container pt-8 md:pt-14 pb-10">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>@{stub.handle}</p>
            <div className="pt-3 flex items-end gap-3 md:gap-4">
              <UserAvatar seed={stub.avatarSeed} size={48} />
              <h1 className="min-w-0 text-[36px] md:text-[56px] font-bold leading-none tracking-[-0.04em] break-keep">{stub.name}</h1>
            </div>
            <p className="pt-8 text-base" style={{ color: "var(--ed-dim)" }}>비공개 아카이브입니다.</p>
          </header>
        </main>
        <SiteFooter admin={viewer.admin} />
      </div>
    );
  }
  const self = viewer.userId === p.userId;
  const ctx = await viewerContext(viewer.userId, p);
  const common = new Set(ctx.common);
  const path = profilePath(p.handle);
  const empty = p.visited.length === 0 && p.wantToGo.length === 0;

  return (
    <div className="editorial-bleed">
      {self && !p.isPublic && (
        <div style={{ background: "#fff6e6", borderBottom: "1px solid var(--ed-line)" }}>
          <p className="ed-container py-2.5 text-xs" style={{ color: "#8a5a00" }}>
            아직 비공개예요 — 지금은 나에게만 보여요.
            <Link href="/settings" className="ml-3 underline underline-offset-4">공개 설정</Link>
          </p>
        </div>
      )}
      <main className="pb-24 md:pb-32">
        <header className="ed-container pt-8 md:pt-14 pb-10 md:pb-14">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>@{p.handle}</p>
          <div className="pt-3 flex items-end gap-3 md:gap-4">
            <UserAvatar seed={avatarSeed(p.userId)} image={p.image} size={48} />
            <h1 className="min-w-0 text-[36px] md:text-[56px] font-bold leading-none tracking-[-0.04em] break-keep">{p.name}</h1>
          </div>
          {p.bio && <p className="pt-4 text-base leading-relaxed break-keep max-w-[560px]">{p.bio}</p>}

          {self ? (
            <>
              <RelationLine path={path} followingCount={p.followingCount} followerCount={p.followerCount} common={0} />
              <div className="pt-6">
                <ShareProfileButton path={path} name={p.name} label="공유" variant="solid" />
              </div>
            </>
          ) : (
            <ProfileFollowArea
              handle={p.handle} path={path} name={p.name} followingCount={p.followingCount} followerCount={p.followerCount}
              common={ctx.common.length} initialFollowing={ctx.following} loggedIn={viewer.loggedIn}
            />
          )}
        </header>

        {empty ? (
          <p className="ed-container py-14 text-sm" style={{ borderTop: "1px solid var(--ed-line)", color: "var(--ed-dim)" }}>
            {self ? "아직 공개한 공간이 없어요. 공간 기록에서 “공개 프로필에 보이기”를 켜면 여기에 보여요." : "아직 공개한 공간이 없어요."}
          </p>
        ) : (
          <>
            {p.visited.length > 0 && (
              <section className="ed-container">
                <h2 className="ed-label pt-6 pb-6 md:pb-8" style={{ borderTop: "1px solid var(--ed-line)" }}>다녀온 공간</h2>
                <ProfileGrid handle={p.handle} cards={p.visited} savedIds={ctx.savedIds} loggedIn={viewer.loggedIn} common={common} priorityFirst />
              </section>
            )}
            {p.wantToGo.length > 0 && (
              <section className={`ed-container ${p.visited.length > 0 ? "pt-14 md:pt-20" : ""}`}>
                <h2 className="ed-label pt-6 pb-6 md:pb-8" style={{ borderTop: "1px solid var(--ed-line)" }}>가보고 싶은 공간</h2>
                <ProfileGrid handle={p.handle} cards={p.wantToGo} savedIds={ctx.savedIds} loggedIn={viewer.loggedIn} common={common} priorityFirst={p.visited.length === 0} />
              </section>
            )}
          </>
        )}
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
