import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import { CuratorAvatar, PrototypeBanner } from "@/components/curators/CuratorBits";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { normalizeArea } from "@/lib/editorial/area";
import { curatorAccess } from "@/lib/curators/access";
import { getCuratedUniverse, listCurators } from "@/lib/curators/queries";

export const metadata: Metadata = { title: "CURATORS — 공간큐브", robots: { index: false } };

const PREFERRED_AREAS = ["연남", "망원", "서촌"];

/**
 * CURATORS 허브(프로토타입) — 공간을 잘 고르는 사람을 통해 새 공간을 발견한다.
 * 큐레이터는 별도 계정이 아니라 공개 프로필을 가진 사용자다. 팔로워 수·순위 같은 SNS 지표는 두지 않고
 * "이 사람은 어떤 공간을 고르는가"(대표 취향 · 컬렉션 제목)만 보여준다.
 */
export default async function CuratorsPage() {
  const viewer = await getEditorialViewer();
  const access = curatorAccess(viewer);
  if (!access.enabled) notFound();

  const [curators, { picks, spaces }] = await Promise.all([listCurators(access), getCuratedUniverse(access)]);
  const collectionsBy = new Map<string, string[]>();
  for (const p of picks) {
    const list = collectionsBy.get(p.curatorSlug) ?? [];
    if (!list.includes(p.collectionTitle)) list.push(p.collectionTitle);
    collectionsBy.set(p.curatorSlug, list);
  }
  const areas = [...new Set([...spaces.values()].map((s) => normalizeArea(s.area)).filter((a): a is string => !!a))]
    .filter((a) => PREFERRED_AREAS.includes(a))
    .sort((a, b) => PREFERRED_AREAS.indexOf(a) - PREFERRED_AREAS.indexOf(b));

  return (
    <div className="editorial-bleed">
      <PrototypeBanner demo={access.includeDemo} />
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-12 pb-10 md:pt-20 md:pb-14" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-4">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Curators</p>
              <h1 className="text-[34px] md:text-[56px] font-bold leading-[1.12] tracking-[-0.04em] break-keep">
                좋은 공간을 아는 사람들은
                <br />
                어디를 좋아할까요?
              </h1>
            </div>
            <p className="md:col-span-5 text-base md:text-lg leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
              모든 공간을 보여주는 대신, 취향 있는 사람들이 먼저 골라낸 공간을 따라갑니다.
            </p>
          </div>
        </header>

        {/* 오늘 갈 곳 — 1~3번 눌러 바로 후보 줄이기 */}
        <section className="ed-container py-8 md:py-10" style={{ background: "var(--ed-soft)" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-lg md:text-xl font-bold">오늘 갈 곳을 찾고 있나요?</p>
              <p className="pt-1 text-sm" style={{ color: "var(--ed-dim)" }}>지역만 고르면 내 취향에 맞는 순서로 보여드려요.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <Link key={a} href={`/find?area=${encodeURIComponent(a)}`} className="inline-flex items-center h-10 px-4 text-sm font-semibold" style={{ background: "var(--ed-bg)", border: "1px solid var(--ed-fg)" }}>
                  {a} →
                </Link>
              ))}
              <Link href="/find" className="inline-flex items-center h-10 px-4 text-sm" style={{ border: "1px solid var(--ed-line)", background: "var(--ed-bg)" }}>전체 추천</Link>
            </div>
          </div>
        </section>

        <section className="ed-container pt-10 md:pt-14">
          {curators.length === 0 ? (
            <p className="py-8 text-base" style={{ color: "var(--ed-dim)" }}>큐레이터를 준비하고 있어요.</p>
          ) : (
            <ul className="grid md:grid-cols-2 md:gap-x-12">
              {curators.map((c) => (
                <li key={c.slug} style={{ borderBottom: "1px solid var(--ed-line)" }}>
                  <Link href={`/curators/${c.slug}`} className="group grid grid-cols-[56px_1fr] gap-4 py-7">
                    <CuratorAvatar name={c.name} imageUrl={c.imageUrl} />
                    <div className="min-w-0 space-y-2">
                      <p className="flex items-baseline gap-2">
                        <span className="text-xl font-bold group-hover:underline underline-offset-4">{c.name}</span>
                        {c.isOfficial && <span className="ed-label" style={{ color: "var(--ed-dim)" }}>Official</span>}
                      </p>
                      <p className="text-sm leading-relaxed break-keep">{c.bio}</p>
                      {(collectionsBy.get(c.slug) ?? []).length > 0 && (
                        <ul className="pt-1 space-y-0.5">
                          {(collectionsBy.get(c.slug) ?? []).slice(0, 2).map((t) => (
                            <li key={t} className="text-xs truncate" style={{ color: "var(--ed-dim)" }}>— {t}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs tabular-nums pt-1" style={{ color: "var(--ed-dim)" }}>
                        컬렉션 {c.collectionCount} · 고른 공간 {c.spaceCount}
                        {c.instagramHandle ? ` · @${c.instagramHandle}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ed-container pt-12">
          <p className="text-xs leading-relaxed max-w-[640px]" style={{ color: "var(--ed-dim)" }}>
            큐레이터도 공간을 찾는 사용자예요. 저장하고 다녀오며 쌓인 자기 취향을 다른 사람에게 공개적으로 나누는 사람일 뿐이에요.
            {viewer.loggedIn && (
              <>
                {" "}
                <Link href="/find" className="underline underline-offset-4">추천</Link>은 나와 취향이 맞는 큐레이터가 고른 공간을 조금 더 앞에 보여줘요.
              </>
            )}
          </p>
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
