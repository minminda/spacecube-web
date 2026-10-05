import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import CurationCard from "@/components/editorial/CurationCard";
import SpaceCard from "@/components/editorial/SpaceCard";
import TabLinks from "@/components/editorial/TabLinks";
import { INDEX_GRID_CLASS } from "@/components/editorial/StoryCard";
import { SPACE_GRID_CLASS } from "@/components/editorial/SpaceTile";
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

const areaHref = (area: string | null) => (area ? `/curation?area=${encodeURIComponent(area)}` : "/curation");

/**
 * CURATION 허브 — 큐레이션을 한눈에 고르는 매거진 인덱스. 지역이 기본 축(상단 지역 탭, 추천의 지역 선택과 같은 모양).
 * 전체: 모든 큐레이션(최신 번호순). 지역: 그 지역의 큐레이션(관점이 둘 이상이면 SITUATION/PURPOSE 탭) + 그 지역의 공간.
 * 카드 = 대표 이미지 · 번호/지역 · 제목 · 한 줄 기준(CurationCard, 홈 미리보기와 같은 카드). 평가·별점·순위 없음.
 */
export default async function CurationHubPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");

  const area = normalizeArea(sp.area);
  const perspective = parsePerspective(sp.p);
  const [areas, curations] = await Promise.all([listAreas(), listCurations()]);

  const inArea = area ? curations.filter((c) => normalizeArea(c.area) === area) : curations;
  const shown = perspective ? inArea.filter((c) => c.perspective === perspective) : inArea;
  const perspectives = (["SITUATION", "PURPOSE"] as const).filter((k) => inArea.some((c) => c.perspective === k));
  const [spaces, savedIds] = area ? await Promise.all([listSpaces(), getSavedEditorialSpaceIds(viewer.userId)]) : [[], new Set<string>()];
  const areaSpaces = spaces.filter((s) => normalizeArea(s.area) === area);

  const areaTabs = [{ key: "all", label: "전체", href: "/curation" }, ...areas.map((a) => ({ key: a.area, label: a.area, href: areaHref(a.area) }))];
  const base = areaHref(area);
  const perspectiveTabs = [
    { key: "all", label: "ALL", href: base },
    ...perspectives.map((k) => ({ key: k, label: `${PERSPECTIVE_LABEL[k].en} · ${PERSPECTIVE_LABEL[k].ko}`, href: `${base}&p=${k}` })),
  ];

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader label="Curation" title={area ?? "CURATION"} description={area ? undefined : "지역에서, 어떤 날과 어떤 마음으로 고른 공간."} />
        <div className="ed-container" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <TabLinks tabs={areaTabs} active={area ?? "all"} label="지역" />
        </div>
        {area && perspectives.length > 1 && (
          <div className="ed-container" style={{ borderBottom: "1px solid var(--ed-line)" }}>
            <TabLinks tabs={perspectiveTabs} active={perspective ?? "all"} label="큐레이션 관점" />
          </div>
        )}

        <section className="ed-container pt-8 md:pt-12">
          {shown.length === 0 ? (
            <p className="text-base py-6" style={{ color: "var(--ed-dim)" }}>
              {area ? `${area} 큐레이션을 준비하고 있어요.` : "첫 번째 큐레이션을 준비하고 있어요."}
            </p>
          ) : (
            <div className={INDEX_GRID_CLASS}>
              {shown.map((c, i) => <CurationCard key={c.id} c={c} priority={i < 2} />)}
            </div>
          )}
        </section>

        {area && areaSpaces.length > 0 && (
          <section className="ed-container pt-16 md:pt-24">
            <div className="flex items-baseline justify-between gap-4 pb-6" style={{ borderTop: "1px solid var(--ed-line)" }}>
              <h2 className="ed-label pt-6" style={{ color: "var(--ed-dim)" }}>{area}의 공간 <span className="tabular-nums">{areaSpaces.length}</span></h2>
              <Link href={`/find?area=${encodeURIComponent(area)}`} className="pt-6 text-xs font-semibold hover:underline underline-offset-4">나에게 맞는 순으로 →</Link>
            </div>
            <div className={SPACE_GRID_CLASS}>
              {areaSpaces.map((s) => (
                <SpaceCard key={s.id} space={s} save={{ saved: savedIds.has(s.id), loggedIn: viewer.loggedIn }} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
