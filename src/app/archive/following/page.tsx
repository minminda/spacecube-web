import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getFollowedTastes } from "@/lib/profile/profileData";
import { profilePath } from "@/lib/profile/publicProfile";

export const metadata: Metadata = { title: "따라가는 취향 — 공간큐브", robots: { index: false } };

/**
 * 따라가는 취향 — 내가 공간 취향을 참고하고 있는 사람들. 피드가 아니라 사람 단위 목록:
 * 이름 · 대표 취향 · 자주 찾는 곳 · 최근 공개 공간 몇 곳 → 프로필로 이동.
 * 지금 공개 중인 프로필만 보여준다(비공개로 바뀌면 목록에서 빠지고 수만 알려준다).
 */
export default async function FollowingTastesPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.userId) redirect("/login?callbackUrl=%2Farchive%2Ffollowing");
  if (!viewer.editorial) notFound();
  const { items, hidden } = await getFollowedTastes(viewer.userId);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <div className="ed-container pt-8 md:pt-12">
          <Link href="/archive" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← 내 아카이브</Link>
        </div>
        <header className="ed-container pt-6 pb-8" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Following Tastes</p>
          <h1 className="pt-3 text-[36px] md:text-[56px] font-bold leading-none tracking-[-0.04em]">따라가는 취향</h1>
          <p className="pt-3 text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            공간 취향을 계속 참고하고 있는 사람들이에요.
          </p>
        </header>

        <section className="ed-container">
          {items.length === 0 ? (
            <p className="py-12 text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
              아직 따라가는 취향이 없어요. 공유받은 공개 프로필이나 큐레이터 프로필에서 “취향 따라가기”를 눌러보세요.
            </p>
          ) : (
            <ul>
              {items.map((t) => (
                <li key={t.handle} style={{ borderBottom: "1px solid var(--ed-line)" }}>
                  <Link href={profilePath(t.handle)} className="group grid gap-4 md:grid-cols-[1fr_auto] md:items-center py-6">
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xl md:text-2xl font-bold tracking-tight group-hover:underline underline-offset-4">{t.name}</p>
                      {t.tasteWords.length > 0 && <p className="text-sm">{t.tasteWords.join(" · ")}</p>}
                      {t.areas.length > 0 && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>자주 찾는 곳 · {t.areas.join(" · ")}</p>}
                      {t.recent.length > 0 && <p className="text-xs truncate" style={{ color: "var(--ed-dim)" }}>최근 공개한 공간 · {t.recent.map((s) => s.name).join(", ")}</p>}
                    </div>
                    {t.recent.length > 0 && (
                      <div className="flex gap-1.5">
                        {t.recent.map((s) => (
                          <div key={s.id} className="relative w-16 h-16 md:w-20 md:h-20 overflow-hidden" style={{ background: "var(--ed-soft)" }}>
                            {s.coverImage && <Image src={s.coverImage} alt={s.name} fill sizes="80px" className="object-cover" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hidden > 0 && (
            <p className="pt-6 text-xs" style={{ color: "var(--ed-dim)" }}>지금은 비공개로 바뀌어 보이지 않는 취향 {hidden}개가 있어요.</p>
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
