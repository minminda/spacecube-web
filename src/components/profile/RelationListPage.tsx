import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/editorial/SiteFooter";
import PersonCard from "./PersonCard";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { previewDemoUsers } from "@/lib/demoData";
import { getPublicProfile, relationList } from "@/lib/profile/profileData";
import { normalizeHandle, profilePath } from "@/lib/profile/publicProfile";

const COPY = {
  following: { label: "Following Tastes", title: "따라가는 취향", empty: "아직 따라가는 취향이 없어요." },
  followers: { label: "Followed By", title: "나를 따라가는 사람", empty: "아직 이 취향을 따라가는 사람이 없어요." },
} as const;

/**
 * 관계 목록(/@handle/following · /@handle/followers) — 사람 단위 목록(피드 아님). 공개 프로필인 사람만 카드로,
 * 비공개 사용자는 수만. 정렬은 최근에 이어진 순(인기순 없음).
 */
export default async function RelationListPage({ rawHandle, kind }: { rawHandle: string; kind: "following" | "followers" }) {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) notFound();
  const handle = normalizeHandle(decodeURIComponent(rawHandle));
  const p = await getPublicProfile(handle, viewer.userId, { curators: false, includeDemo: previewDemoUsers(viewer.admin) });
  if (!p) notFound();
  const { people, hidden, following } = await relationList(p.userId, kind, viewer.userId);
  const c = COPY[kind];
  const path = profilePath(p.handle);

  return (
    <div className="editorial-bleed">
      <main className="pb-24 md:pb-32">
        <div className="ed-container pt-8 md:pt-12">
          <Link href={path} className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← {p.name}</Link>
        </div>
        <header className="ed-container pt-6 pb-6">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{c.label}</p>
          <h1 className="pt-3 text-[32px] md:text-[48px] font-bold leading-none tracking-[-0.04em]">{c.title}</h1>
        </header>
        <section className="ed-container" style={{ borderTop: "1px solid var(--ed-fg)" }}>
          {people.length === 0 ? (
            <p className="py-12 text-sm" style={{ color: "var(--ed-dim)" }}>{c.empty}</p>
          ) : (
            people.map((person) => (
              <PersonCard key={person.handle} p={person} following={following.has(person.userId)} loggedIn={viewer.loggedIn} self={person.userId === viewer.userId} returnTo={`${path}/${kind}`} />
            ))
          )}
          {hidden > 0 && <p className="pt-6 text-xs" style={{ color: "var(--ed-dim)" }}>공개 프로필이 아닌 {hidden}명은 목록에 보이지 않아요.</p>}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
