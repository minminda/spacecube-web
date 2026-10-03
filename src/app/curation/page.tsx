import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import CurationCard from "@/components/editorial/CurationCard";
import SpaceCard from "@/components/editorial/SpaceCard";
import TabLinks from "@/components/editorial/TabLinks";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { listAreas, listCurations, listSpaces } from "@/lib/editorial/queries";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { normalizeArea } from "@/lib/editorial/area";
import { PERSPECTIVE_LABEL, type CurationPerspectiveValue } from "@/lib/editorial/types";

export const metadata: Metadata = {
  title: "CURATION — 공간큐브",
  description: "지역을 기본으로, 상황과 취향에서 출발해 공간을 발견합니다.",
};

interface Props {
  searchParams: Promise<{ area?: string; p?: string }>;
}

function parsePerspective(raw: string | undefined): CurationPerspectiveValue | null {
  return raw === "SITUATION" || raw === "PURPOSE" ? raw : null;
}

const PERSPECTIVE_EXAMPLE: Record<CurationPerspectiveValue, string> = {
  SITUATION: "혼자 있고 싶은 날, 비 오는 오후, 약속보다 일찍 도착한 한 시간 — 어떤 날에서 출발합니다.",
  PURPOSE: "음악을 천천히 듣고 싶을 때, 책과 오래 머물고 싶을 때 — 공간에서 하고 싶은 것에서 출발합니다.",
};

/**
 * CURATION 허브 — 지역이 기본 축이다. 첫 화면은 지역 목록, 지역을 고르면 그 지역의 큐레이션을
 * SITUATION(상황) / PURPOSE(취향·목적) 관점으로 나눠 보고, 그 지역의 공간도 함께 둘러본다.
 * 평가·별점·순위 정렬 없음 — 큐레이션은 최신 번호순, 공간은 등록순.
 */
export default async function CurationHubPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");

  const area = normalizeArea(sp.area);
  const perspective = parsePerspective(sp.p);
  const [areas, curations] = await Promise.all([listAreas(), listCurations()]);

  /* ── 지역 미선택: 지역이 가장 먼저 보이는 첫 화면 ── */
  if (!area) {
    const recent = curations.slice(0, 4);
    const topical = curations.filter((c) => !normalizeArea(c.area));
    return (
      <div className="editorial-bleed">
        <main className="pb-20 md:pb-28">
          <PageHeader label="Curation" title="CURATION" description="지역을 기본으로, 어떤 날의 상황이나 하고 싶은 것에서 출발해 공간을 발견합니다." />

          <section className="ed-container pt-10 md:pt-14">
            <p className="ed-label pb-4" style={{ color: "var(--ed-dim)" }}>어디에서 찾아볼까요</p>
            {areas.length === 0 ? (
              <p className="text-base py-8" style={{ color: "var(--ed-dim)" }}>첫 번째 지역 큐레이션을 준비하고 있습니다.</p>
            ) : (
              <ul style={{ borderTop: "1px solid var(--ed-fg)" }}>
                {areas.map((a) => (
                  <li key={a.area} style={{ borderBottom: "1px solid var(--ed-line)" }}>
                    <Link href={`/curation?area=${encodeURIComponent(a.area)}`} className="group flex items-baseline justify-between gap-6 py-5 md:py-7">
                      <span className="text-[32px] md:text-[56px] font-bold leading-none tracking-[-0.04em] group-hover:underline underline-offset-8 decoration-2">{a.area}</span>
                      <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--ed-dim)" }}>
                        {a.curationCount > 0 ? `큐레이션 ${a.curationCount} · ` : ""}공간 {a.spaceCount}
                        <span aria-hidden className="ml-3">→</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ed-container pt-14 md:pt-20 grid gap-8 md:grid-cols-2">
            {(["SITUATION", "PURPOSE"] as const).map((k) => (
              <div key={k} className="space-y-2 pt-4" style={{ borderTop: "1px solid var(--ed-fg)" }}>
                <p className="ed-label">{PERSPECTIVE_LABEL[k].en} · {PERSPECTIVE_LABEL[k].ko}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>{PERSPECTIVE_EXAMPLE[k]}</p>
              </div>
            ))}
          </section>

          {recent.length > 0 && (
            <section className="ed-container pt-14 md:pt-20">
              <p className="ed-label pb-6" style={{ color: "var(--ed-dim)" }}>최근 큐레이션</p>
              <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 md:gap-8">
                {recent.map((c) => <CurationCard key={c.id} c={c} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" />)}
              </div>
            </section>
          )}

          {topical.length > 0 && (
            <section className="ed-container pt-14 md:pt-20">
              <p className="ed-label pb-6" style={{ color: "var(--ed-dim)" }}>지역과 무관한 주제</p>
              <div className="grid gap-12 md:grid-cols-3 md:gap-8">
                {topical.map((c) => <CurationCard key={c.id} c={c} />)}
              </div>
            </section>
          )}
        </main>
        <SiteFooter admin={viewer.admin} />
      </div>
    );
  }

  /* ── 지역 선택: 그 지역의 큐레이션(관점별) + 그 지역의 공간 ── */
  const inArea = curations.filter((c) => normalizeArea(c.area) === area);
  const shown = perspective ? inArea.filter((c) => c.perspective === perspective) : inArea;
  const [spaces, savedIds] = await Promise.all([listSpaces(), getSavedEditorialSpaceIds(viewer.userId)]);
  const areaSpaces = spaces.filter((s) => normalizeArea(s.area) === area);
  const base = `/curation?area=${encodeURIComponent(area)}`;
  const tabs = [
    { key: "all", label: "ALL", href: base },
    { key: "SITUATION", label: "SITUATION · 상황", href: `${base}&p=SITUATION` },
    { key: "PURPOSE", label: "PURPOSE · 취향·목적", href: `${base}&p=PURPOSE` },
  ];
  const otherAreas = areas.filter((a) => a.area !== area);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <header className="ed-container pt-10 md:pt-16 pb-8" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <Link href="/curation" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--ed-dim)" }}>← 지역 선택</Link>
          <div className="mt-8 md:mt-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-4">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Curation</p>
              <h1 className="text-[64px] md:text-[112px] font-bold leading-[0.95] tracking-[-0.05em]">{area}</h1>
            </div>
            <p className="md:col-span-5 text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>
              {area}의 어떤 날, 어떤 마음에 어울리는 공간들. 큐레이션 {inArea.length}편 · 공간 {areaSpaces.length}곳
            </p>
          </div>
        </header>
        <div className="ed-container" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <TabLinks tabs={tabs} active={perspective ?? "all"} label="큐레이션 관점" />
        </div>

        <section className="ed-container pt-10 md:pt-14">
          {shown.length === 0 ? (
            <p className="text-base py-6" style={{ color: "var(--ed-dim)" }}>
              {perspective ? `${area}의 ${PERSPECTIVE_LABEL[perspective].ko} 큐레이션을 준비하고 있습니다.` : `${area} 큐레이션을 준비하고 있습니다.`}
            </p>
          ) : (
            <div className="grid gap-12 md:grid-cols-3 md:gap-x-10 md:gap-y-16">
              {shown.map((c) => <CurationCard key={c.id} c={c} />)}
            </div>
          )}
        </section>

        {areaSpaces.length > 0 && (
          <section className="ed-container pt-16 md:pt-24">
            <p className="ed-label pb-8" style={{ color: "var(--ed-dim)" }}>{area}의 공간</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8">
              {areaSpaces.map((s) => (
                <SpaceCard key={s.id} space={s} sizes="(min-width: 768px) 25vw, 50vw" showSummary save={{ saved: savedIds.has(s.id), loggedIn: viewer.loggedIn }} />
              ))}
            </div>
          </section>
        )}

        {otherAreas.length > 0 && (
          <nav aria-label="다른 지역" className="ed-container pt-16 md:pt-24">
            <p className="ed-label pb-4" style={{ color: "var(--ed-dim)" }}>다른 지역</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {otherAreas.map((a) => (
                <li key={a.area}>
                  <Link href={`/curation?area=${encodeURIComponent(a.area)}`} className="text-xl md:text-2xl font-bold hover:underline underline-offset-4">{a.area}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
