import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import { PickCard, PrototypeBanner } from "@/components/curators/CuratorBits";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { normalizeArea } from "@/lib/editorial/area";
import { curatorAccess } from "@/lib/curators/access";
import { AFFINITY_LABEL } from "@/lib/curators/affinity";
import { curatorDisplayName } from "@/lib/curators/finder";
import { FINDER_MOODS, FINDER_PURPOSES, filterCandidates, parseFinderQuery, personalReason, rankCandidates, type FinderQuery } from "@/lib/finder/spaceFinder";
import { getFinderPool, getFinderViewer } from "@/lib/finder/finderData";

export const metadata: Metadata = { title: "공간 찾기 — 공간큐브", description: "지역을 고르면, 나에게 맞을 가능성이 높은 공간부터 보여드려요." };

interface Props {
  searchParams: Promise<{ area?: string; q?: string; feel?: string; for?: string; n?: string }>;
}

const PREFERRED_AREAS = ["연남", "망원", "서촌", "성수"];
const PAGE = 30;
const PURPOSES_FIRST = 4;

function hrefFor(q: FinderQuery, n?: number): string {
  const p = new URLSearchParams();
  if (q.area) p.set("area", q.area);
  if (q.q) p.set("q", q.q);
  if (q.moods.length) p.set("feel", q.moods.join(","));
  if (q.purposes.length) p.set("for", q.purposes.join(","));
  if (n) p.set("n", String(n));
  const s = p.toString();
  return s ? `/find?${s}` : "/find";
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v].slice(-3);
}

function Chip({ label, on, href, size = "md" }: { label: string; on: boolean; href: string; size?: "md" | "lg" }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={on}
      className={`inline-flex items-center whitespace-nowrap transition-colors ${size === "lg" ? "h-11 px-5 text-base font-semibold" : "h-9 px-3.5 text-sm"}`}
      style={on ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-line)" }}
    >
      {label}
    </Link>
  );
}

/**
 * 공간 찾기 — 찾기 자체가 개인화 추천이다.
 * 지역을 고르면 그 지역 공간 전부를 보여주되, 나에게 맞을 가능성이 높은 순서로 놓는다. 검색·필터는 후보를 줄이고, 정렬은 그대로 개인 취향을 따른다.
 * 취향 데이터가 없으면 공간큐브 큐레이션·컬렉션에 담긴 정도 → 공개 순서로 보여준다(빈 화면 없음).
 * 공개 정책은 다른 새 정보구조 화면과 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기).
 */
export default async function FindPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");
  const access = curatorAccess(viewer);
  const q = parseFinderQuery(sp);
  const limit = Math.min(Math.max(Number(sp.n) || PAGE, PAGE), 300);

  const [pool, me, savedIds] = await Promise.all([
    getFinderPool(access),
    getFinderViewer(viewer.userId, access),
    getSavedEditorialSpaceIds(viewer.userId),
  ]);

  const areas = [...new Set(pool.map((s) => normalizeArea(s.area)).filter((a): a is string => !!a))].sort((a, b) => {
    const ia = PREFERRED_AREAS.indexOf(a), ib = PREFERRED_AREAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, "ko");
  });
  const ranked = rankCandidates(filterCandidates(pool, q), me.personalized ? me.profile : null, me.curatorBoost);
  const shown = ranked.slice(0, limit);
  const filtered = !!(q.q || q.moods.length || q.purposes.length);
  const conditionText = [q.area ?? "전체", q.q ? `“${q.q}”` : null, ...q.moods, ...q.purposes].filter(Boolean).join(" · ");
  const matchedCurators = me.affinities.filter((a) => a.level !== "new").slice(0, 2);
  const demoShown = access.includeDemo && pool.some((s) => s.view.isDemo);

  return (
    <div className="editorial-bleed">
      {demoShown && <PrototypeBanner demo />}
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-6">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Find</p>
          <h1 className="pt-3 text-[40px] md:text-[64px] font-bold leading-none tracking-[-0.04em]">공간 찾기</h1>
          <p className="pt-3 text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            지역을 고르면, 나에게 맞을 가능성이 높은 공간부터 보여드려요.
          </p>
          <form method="get" action="/find" role="search" className="pt-6 flex gap-2 max-w-[640px]">
            {q.area && <input type="hidden" name="area" value={q.area} />}
            {q.moods.length > 0 && <input type="hidden" name="feel" value={q.moods.join(",")} />}
            {q.purposes.length > 0 && <input type="hidden" name="for" value={q.purposes.join(",")} />}
            <input
              name="q"
              defaultValue={q.q}
              placeholder="공간 이름 또는 원하는 느낌을 검색해보세요."
              aria-label="공간 검색"
              className="flex-1 min-w-0 h-12 px-4 text-base outline-none"
              style={{ border: "1px solid var(--ed-fg)" }}
            />
            <button type="submit" className="h-12 px-5 text-sm font-semibold shrink-0" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>검색</button>
          </form>
        </header>

        <section className="ed-container space-y-5 pb-6" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <div className="space-y-2">
            <p className="text-sm font-semibold">어디에서 찾으세요?</p>
            <div className="flex flex-wrap gap-2">
              <Chip label="전체" on={!q.area} href={hrefFor({ ...q, area: null })} size="lg" />
              {areas.map((a) => <Chip key={a} label={a} on={q.area === a} href={hrefFor({ ...q, area: a })} size="lg" />)}
            </div>
          </div>
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>분위기</p>
            <div className="flex flex-wrap gap-2">
              {FINDER_MOODS.map((m) => <Chip key={m.key} label={m.key} on={q.moods.includes(m.key)} href={hrefFor({ ...q, moods: toggle(q.moods, m.key) })} />)}
            </div>
          </div>
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>유형 · 목적</p>
            <div className="flex flex-wrap gap-2">
              {FINDER_PURPOSES.slice(0, PURPOSES_FIRST).map((p) => <Chip key={p.key} label={p.key} on={q.purposes.includes(p.key)} href={hrefFor({ ...q, purposes: toggle(q.purposes, p.key) })} />)}
              {FINDER_PURPOSES.slice(PURPOSES_FIRST).some((p) => q.purposes.includes(p.key))
                ? FINDER_PURPOSES.slice(PURPOSES_FIRST).map((p) => <Chip key={p.key} label={p.key} on={q.purposes.includes(p.key)} href={hrefFor({ ...q, purposes: toggle(q.purposes, p.key) })} />)
                : (
                  <details className="w-full sm:w-auto">
                    <summary className="inline-flex items-center h-9 px-3.5 text-sm cursor-pointer select-none" style={{ color: "var(--ed-dim)" }}>더보기</summary>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {FINDER_PURPOSES.slice(PURPOSES_FIRST).map((p) => <Chip key={p.key} label={p.key} on={false} href={hrefFor({ ...q, purposes: toggle(q.purposes, p.key) })} />)}
                    </div>
                  </details>
                )}
            </div>
          </div>
          {filtered && <Link href={hrefFor({ area: q.area, q: "", moods: [], purposes: [] })} scroll={false} className="inline-block text-xs underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>검색·필터 지우기</Link>}
        </section>

        <section className="ed-container pt-6" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm">
              <strong>{conditionText}</strong>
              <span className="tabular-nums" style={{ color: "var(--ed-dim)" }}> · {ranked.length}곳</span>
            </p>
            <p className="text-xs" style={{ color: "var(--ed-dim)" }}>
              {me.personalized ? "나에게 맞는 순" : "공간큐브 큐레이션에 담긴 곳 먼저"}
            </p>
          </div>

          {!me.personalized && (
            <p className="mt-3 py-3 text-sm leading-relaxed break-keep" style={{ borderTop: "1px solid var(--ed-line)", borderBottom: "1px solid var(--ed-line)", color: "var(--ed-dim)" }}>
              {viewer.loggedIn ? (
                <>아직 취향을 알아가는 중이에요. 공간을 저장하고 방문할수록 더 잘 맞는 순서로 보여드릴게요.</>
              ) : (
                <>
                  <Link href={`/login?callbackUrl=${encodeURIComponent(hrefFor(q))}`} className="underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>로그인</Link>하면 저장하고 다녀온 공간을 바탕으로 나에게 맞는 순서로 보여드려요.
                </>
              )}
            </p>
          )}

          {matchedCurators.length > 0 && (
            <p className="mt-3 text-xs" style={{ color: "var(--ed-dim)" }}>
              취향이 잘 맞는 큐레이터 ·{" "}
              {matchedCurators.map((a, i) => (
                <span key={a.curator.slug}>
                  {i > 0 && ", "}
                  <Link href={`/curators/${a.curator.slug}`} className="font-semibold underline underline-offset-4" style={{ color: "var(--ed-fg)" }}>{a.curator.name}</Link> ({AFFINITY_LABEL[a.level]})
                </span>
              ))}
              {" "}— 이분들이 고른 공간을 조금 더 앞에 놓았어요.
            </p>
          )}

          {shown.length === 0 ? (
            <div className="py-10 space-y-2">
              <p className="text-lg font-bold">조건에 맞는 공간이 없어요.</p>
              <p className="text-sm" style={{ color: "var(--ed-dim)" }}>검색어나 필터를 하나 빼보거나 다른 지역을 골라보세요.</p>
            </div>
          ) : (
            <div className="pt-2">
              {shown.map((r, i) => {
                const col = r.affineCollections[0] ?? r.space.collections[0];
                const relations = [
                  col ? `${curatorDisplayName({ name: col.curatorName, isOfficial: col.curatorIsOfficial })}의 '${col.title}'에 포함` : null,
                  r.space.curations[0] ? `공간큐브 큐레이션 '${r.space.curations[0].title}'에 포함` : null,
                ].filter(Boolean).join(" · ");
                const visited = me.visitedSlugs.has(r.space.view.slug);
                const reason = [visited ? "다녀온 공간" : null, me.personalized ? personalReason(r.matched) : null].filter(Boolean).join(" · ");
                return (
                  <PickCard
                    key={r.space.id}
                    space={r.space.view}
                    priority={i < 2}
                    curatorsLine={relations || undefined}
                    reason={reason || null}
                    save={{ saved: savedIds.has(r.space.id), loggedIn: viewer.loggedIn }}
                  />
                );
              })}
            </div>
          )}

          {ranked.length > limit && (
            <div className="pt-8 text-center">
              <Link href={hrefFor(q, limit + PAGE)} scroll={false} className="inline-flex items-center h-10 px-5 text-sm" style={{ border: "1px solid var(--ed-line)" }}>
                더 보기 <span className="ml-2 tabular-nums" style={{ color: "var(--ed-dim)" }}>{ranked.length - limit}</span>
              </Link>
            </div>
          )}

          <p className="pt-12 text-xs leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            순서는 내가 다녀오고 저장하고 아카이브에 남긴 공간의 유형·태그, 직접 고른 취향 태그로 정해요.
            {" "}<Link href="/archive" className="underline underline-offset-4">내 아카이브</Link>
          </p>
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
