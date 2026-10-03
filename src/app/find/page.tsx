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
import { filterCandidates, parseFinderQuery, personalReason, rankCandidates, type FinderQuery } from "@/lib/finder/spaceFinder";
import { getFinderPool, getFinderViewer } from "@/lib/finder/finderData";

export const metadata: Metadata = { title: "추천 — 공간큐브", description: "지역만 고르면, 지금까지의 공간 경험을 바탕으로 나에게 맞는 공간부터 보여드려요." };

interface Props {
  searchParams: Promise<{ area?: string; q?: string; feel?: string; for?: string; n?: string }>;
}

const PREFERRED_AREAS = ["연남", "망원", "서촌", "성수"];
const PAGE = 30;

function hrefFor(q: FinderQuery, n?: number): string {
  const p = new URLSearchParams();
  if (q.area) p.set("area", q.area);
  if (q.q) p.set("q", q.q);
  if (n) p.set("n", String(n));
  const s = p.toString();
  return s ? `/find?${s}` : "/find";
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
 * 추천 — 공간을 찾는 전체 과정. 사용자가 고르는 것은 "지역" 하나뿐이다.
 * 지역 Pool → 저장·방문·아카이브·Cube 경험·큐레이터 관계로 쌓인 취향을 자동으로 적용 → 나에게 맞는 순서로 전부 보여준다.
 * 분위기·유형·목적 같은 수동 필터는 이번 단계에서 두지 않는다(태그는 정렬 엔진 안에서 계속 쓰인다).
 *   옛 링크의 feel/for 파라미터는 읽되 적용하지 않는다 — 화면에 없는 조건으로 후보가 줄어들지 않게.
 * 검색은 보조 기능: 고른 지역 안에서 후보를 줄이고, 정렬은 그대로 개인 취향을 따른다.
 * 취향 데이터가 없으면 공간큐브 큐레이션·컬렉션에 담긴 정도 → 공개 순서로 보여준다(빈 화면 없음).
 * 공개 정책은 다른 새 정보구조 화면과 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기).
 */
export default async function FindPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");
  const access = curatorAccess(viewer);
  const q: FinderQuery = { ...parseFinderQuery(sp), moods: [], purposes: [] };
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
  const areaTitle = q.area ? `${q.area}에서 나에게 맞는 공간` : "나에게 맞는 공간";
  const matchedCurators = me.affinities.filter((a) => a.level !== "new").slice(0, 2);
  const demoShown = access.includeDemo && pool.some((s) => s.view.isDemo);

  return (
    <div className="editorial-bleed">
      {demoShown && <PrototypeBanner demo />}
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-6" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Recommend</p>
          <h1 className="pt-3 text-[40px] md:text-[64px] font-bold leading-none tracking-[-0.04em]">추천</h1>
          <p className="pt-3 text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            지역만 고르세요. 지금까지 저장하고 다녀온 공간을 바탕으로 나에게 맞는 순서로 보여드려요.
          </p>
          <div className="pt-7 space-y-3">
            <h2 className="text-lg md:text-xl font-bold tracking-[-0.02em]">어디에서 찾고 있나요?</h2>
            <div className="flex flex-wrap gap-2">
              <Chip label="전체" on={!q.area} href={hrefFor({ ...q, area: null })} size="lg" />
              {areas.map((a) => <Chip key={a} label={a} on={q.area === a} href={hrefFor({ ...q, area: a })} size="lg" />)}
            </div>
          </div>
        </header>

        <section className="ed-container pt-6" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm">
              <strong>{areaTitle}</strong>
              {q.q && <span> · “{q.q}”</span>}
              <span className="tabular-nums" style={{ color: "var(--ed-dim)" }}> · {ranked.length}곳</span>
            </p>
            <p className="text-xs" style={{ color: "var(--ed-dim)" }}>
              {me.personalized ? "나에게 맞는 순" : "공간큐브 큐레이션에 담긴 곳 먼저"}
            </p>
          </div>

          {/* 보조 검색 — 고른 지역 안에서 공간명·유형·태그·큐레이터·컬렉션으로 좁힌다. 정렬은 그대로 개인 취향. */}
          <form method="get" action="/find" role="search" className="mt-4 flex gap-2 max-w-[520px]">
            {q.area && <input type="hidden" name="area" value={q.area} />}
            <input
              name="q"
              defaultValue={q.q}
              placeholder={q.area ? `${q.area}에서 검색 (공간명, 유형, 태그)` : "공간명, 지역, 유형, 태그로 검색"}
              aria-label="추천 결과 안에서 검색"
              className="flex-1 min-w-0 h-10 px-3 text-sm outline-none"
              style={{ border: "1px solid var(--ed-line)" }}
            />
            <button type="submit" className="h-10 px-4 text-sm shrink-0" style={{ border: "1px solid var(--ed-fg)" }}>검색</button>
            {q.q && <Link href={hrefFor({ ...q, q: "" })} scroll={false} className="self-center text-xs underline underline-offset-4 shrink-0" style={{ color: "var(--ed-dim)" }}>지우기</Link>}
          </form>

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
              <p className="text-sm" style={{ color: "var(--ed-dim)" }}>{q.q ? "검색어를 바꾸거나 지워보세요." : "다른 지역을 골라보세요."}</p>
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
            순서는 내가 저장하고 다녀오고 아카이브에 남긴 공간의 유형·태그, 직접 고른 취향 태그로 정해요. 분위기나 목적을 다시 고르지 않아도 돼요.
            {" "}<Link href="/archive" className="underline underline-offset-4">내 아카이브</Link>
          </p>
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
