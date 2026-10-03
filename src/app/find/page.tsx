import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import { PickCard, PrototypeBanner, CuratorAvatar } from "@/components/curators/CuratorBits";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { normalizeArea } from "@/lib/editorial/area";
import { curatorAccess } from "@/lib/curators/access";
import { getCuratedUniverse, listCurators } from "@/lib/curators/queries";
import { FINDER_FEELS, FINDER_PURPOSES, curatorDisplayName, curatorsLine, finderReason, parseFinderQuery, runFinder, type FinderQuery } from "@/lib/curators/finder";

export const metadata: Metadata = { title: "오늘 갈 곳 찾기 — 공간큐브", robots: { index: false } };

interface Props {
  searchParams: Promise<{ area?: string; feel?: string; for?: string }>;
}

const PREFERRED_AREAS = ["연남", "망원", "서촌"];
const MAX_RESULTS = 8;

function hrefFor(q: FinderQuery): string {
  const p = new URLSearchParams();
  if (q.area) p.set("area", q.area);
  if (q.feels.length) p.set("feel", q.feels.join(","));
  if (q.purposes.length) p.set("for", q.purposes.join(","));
  const s = p.toString();
  return s ? `/find?${s}` : "/find";
}

/** 칩 하나 — 누르면 그 조건을 켜고/끄는 URL로 이동(서버 렌더, 자바스크립트 없이도 동작). */
function Chip({ label, on, href }: { label: string; on: boolean; href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={on}
      className="inline-flex items-center h-10 px-4 text-sm whitespace-nowrap transition-colors"
      style={on ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-line)" }}
    >
      {label}
    </Link>
  );
}

function toggle(list: string[], v: string, max: number): string[] {
  if (list.includes(v)) return list.filter((x) => x !== v);
  return [...list, v].slice(-max);
}

/**
 * 빠른 공간 찾기(큐레이터 프로토타입) — 지역 · 느낌 · 목적을 1~3번 눌러 바로 후보를 줄인다.
 * 후보는 큐레이터가 컬렉션에 담은 공간만. 결과마다 맞은 조건 · 추천한 큐레이터 · 큐레이터 코멘트를 보여준다.
 */
export default async function FindPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  const access = curatorAccess(viewer);
  if (!access.enabled) notFound();

  const q = parseFinderQuery(sp);
  const [{ picks, spaces }, curators, savedIds] = await Promise.all([
    getCuratedUniverse(access),
    listCurators(access),
    getSavedEditorialSpaceIds(viewer.userId),
  ]);

  const areas = [...new Set([...spaces.values()].map((s) => normalizeArea(s.area)).filter((a): a is string => !!a))]
    .sort((a, b) => {
      const ia = PREFERRED_AREAS.indexOf(a), ib = PREFERRED_AREAS.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, "ko");
    });
  const chosen = !!q.area || q.feels.length > 0 || q.purposes.length > 0;
  const results = chosen ? runFinder([...spaces.values()], picks, q) : [];
  const full = results.filter((r) => r.allMatched);
  const partial = results.filter((r) => !r.allMatched);
  const shown = [...full, ...partial].slice(0, MAX_RESULTS);
  const fullShown = shown.filter((r) => r.allMatched);
  const partialShown = shown.filter((r) => !r.allMatched);
  const officialBySlug = new Map(curators.map((c) => [c.slug, c.isOfficial]));

  // 결과를 가장 많이 고른 큐레이터 — "이 조건과 결이 맞는 사람"
  const curatorHits = new Map<string, number>();
  for (const r of shown) for (const c of r.curators) curatorHits.set(c.slug, (curatorHits.get(c.slug) ?? 0) + 1);
  const topCurators = curators.filter((c) => curatorHits.has(c.slug)).sort((a, b) => (curatorHits.get(b.slug) ?? 0) - (curatorHits.get(a.slug) ?? 0)).slice(0, 3);

  const conditionText = [q.area, ...q.feels, ...q.purposes].filter(Boolean).join(" · ");
  const renderCard = (r: (typeof shown)[number], i: number) => (
    <PickCard
      key={r.space.id}
      space={r.space}
      priority={i < 2}
      comment={r.comment ? { text: r.comment.text, by: `${curatorDisplayName({ name: r.comment.curatorName, isOfficial: r.comment.curatorIsOfficial })} · ${r.comment.collectionTitle}` } : null}
      curatorsLine={curatorsLine(r.curators.map((c) => ({ name: c.name, isOfficial: officialBySlug.get(c.slug) })))}
      reason={finderReason(r.matched)}
      save={{ saved: savedIds.has(r.space.id), loggedIn: viewer.loggedIn }}
    />
  );

  return (
    <div className="editorial-bleed">
      <PrototypeBanner demo={access.includeDemo} />
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-6">
          <Link href="/curators" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← CURATORS</Link>
          <h1 className="pt-6 text-[32px] md:text-[56px] font-bold leading-[1.1] tracking-[-0.04em] break-keep">오늘 어떤 공간을 찾고 있나요?</h1>
          <p className="pt-3 text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            취향 있는 사람들이 먼저 골라낸 공간 중에서 찾아요. 한두 번만 눌러보세요.
          </p>
        </header>

        <section className="ed-container space-y-5 pb-8" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>지역</p>
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => <Chip key={a} label={a} on={q.area === a} href={hrefFor({ ...q, area: q.area === a ? null : a })} />)}
            </div>
          </div>
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>느낌</p>
            <div className="flex flex-wrap gap-2">
              {FINDER_FEELS.map((f) => <Chip key={f} label={f} on={q.feels.includes(f)} href={hrefFor({ ...q, feels: toggle(q.feels, f, 2) })} />)}
            </div>
          </div>
          <div className="space-y-2">
            <p className="ed-label" style={{ color: "var(--ed-dim)" }}>하고 싶은 것</p>
            <div className="flex flex-wrap gap-2">
              {FINDER_PURPOSES.map((p) => <Chip key={p.key} label={p.key} on={q.purposes.includes(p.key)} href={hrefFor({ ...q, purposes: toggle(q.purposes, p.key, 2) })} />)}
            </div>
          </div>
          {chosen && <Link href="/find" scroll={false} className="inline-block text-xs underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>조건 지우기</Link>}
        </section>

        <section className="ed-container pt-8" aria-live="polite">
          {!chosen ? (
            <p className="py-6 text-base" style={{ color: "var(--ed-dim)" }}>지역이나 느낌을 하나 골라보세요.</p>
          ) : shown.length === 0 ? (
            <div className="py-6 space-y-2">
              <p className="text-lg font-bold">{conditionText}에 맞는 큐레이터 공간이 아직 없어요.</p>
              <p className="text-sm" style={{ color: "var(--ed-dim)" }}>조건을 하나 빼보거나 다른 지역을 골라보세요.</p>
            </div>
          ) : (
            <>
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{conditionText}</p>
              <h2 className="pt-2 text-xl md:text-3xl font-bold tracking-[-0.03em] break-keep">
                {fullShown.length > 0
                  ? `지금 당신에게 맞을 만한 ${q.area ? `${q.area} ` : ""}공간 ${fullShown.length}곳`
                  : "조건을 모두 만족하는 곳은 아직 없어요"}
              </h2>
              <div className="pt-4">
                {fullShown.map((r, i) => renderCard(r, i))}
              </div>
              {partialShown.length > 0 && (
                <>
                  <p className="pt-10 ed-label" style={{ color: "var(--ed-dim)" }}>
                    {fullShown.length > 0 ? `조건 일부만 맞는 곳 · ${partialShown.length}` : `조건 일부가 맞는 곳 · ${partialShown.length}`}
                  </p>
                  <div className="pt-2">{partialShown.map((r, i) => renderCard(r, fullShown.length + i))}</div>
                </>
              )}
            </>
          )}
        </section>

        {topCurators.length > 0 && (
          <section className="ed-container pt-14">
            <p className="ed-label pb-4" style={{ color: "var(--ed-dim)" }}>이 조건과 결이 맞는 큐레이터</p>
            <ul className="grid gap-4 md:grid-cols-3">
              {topCurators.map((c) => (
                <li key={c.slug}>
                  <Link href={`/curators/${c.slug}`} className="group flex items-center gap-3 py-2">
                    <CuratorAvatar name={c.name} imageUrl={c.imageUrl} size={44} />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold group-hover:underline underline-offset-4">{c.name}</span>
                      <span className="block text-xs truncate" style={{ color: "var(--ed-dim)" }}>위 결과 중 {curatorHits.get(c.slug)}곳을 골랐어요</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
