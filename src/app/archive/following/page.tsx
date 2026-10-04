import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import PersonCard from "@/components/profile/PersonCard";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { relationList } from "@/lib/profile/profileData";

export const metadata: Metadata = { title: "따라가는 취향 — 공간큐브", robots: { index: false } };

/**
 * 내가 따라가는 취향 — 공개 프로필이 없어도 볼 수 있는 내 목록(공개 프로필이 있으면 /@me/following과 같은 내용).
 * 사람 단위 카드(사진 중심). 피드가 아니다. 비공개로 바뀐 사람은 목록에서 빠지고 수만.
 */
export default async function MyFollowingPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.userId) redirect("/login?callbackUrl=%2Farchive%2Ffollowing");
  if (!viewer.editorial) notFound();
  const { people, hidden, following } = await relationList(viewer.userId, "following", viewer.userId);

  return (
    <div className="editorial-bleed">
      <main className="pb-24 md:pb-32">
        <div className="ed-container pt-8 md:pt-12 flex justify-between gap-4">
          <Link href="/archive" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← 내 아카이브</Link>
          <Link href="/archive/people" className="text-xs font-semibold hover:underline underline-offset-4">사람 찾기 →</Link>
        </div>
        <header className="ed-container pt-6 pb-6">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Following Tastes</p>
          <h1 className="pt-3 text-[32px] md:text-[48px] font-bold leading-none tracking-[-0.04em]">따라가는 취향</h1>
          <p className="pt-3 text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>공간 취향을 계속 참고하고 있는 사람들이에요.</p>
        </header>
        <section className="ed-container" style={{ borderTop: "1px solid var(--ed-fg)" }}>
          {people.length === 0 ? (
            <p className="py-12 text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
              아직 따라가는 취향이 없어요. <Link href="/archive/people" className="underline underline-offset-4">사람 찾기</Link>로 친구를 찾거나, 공유받은 프로필에서 “취향 따라가기”를 눌러보세요.
            </p>
          ) : (
            people.map((p) => <PersonCard key={p.handle} p={p} following={following.has(p.userId)} loggedIn self={false} returnTo="/archive/following" />)
          )}
          {hidden > 0 && <p className="pt-6 text-xs" style={{ color: "var(--ed-dim)" }}>지금은 비공개로 바뀌어 보이지 않는 취향 {hidden}개가 있어요.</p>}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
