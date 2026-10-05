import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import CurationArticle from "@/components/editorial/CurationArticle";
import SiteFooter from "@/components/editorial/SiteFooter";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getBlockSpaces, getCurationBySlug, listCurations } from "@/lib/editorial/queries";
import { formatEditorialDate } from "@/lib/editorial/types";
import { curationEyebrowLine, curationSpaceCountLabel } from "@/lib/editorial/draftView";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { normalizeArea } from "@/lib/editorial/area";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCurationBySlug(slug);
  if (!c) return { robots: { index: false } };
  return { title: `${c.area ? `${c.area} — ` : ""}${c.title} — 공간큐브`, description: c.summary };
}

/** CURATION 상세 — 발행된 것만 공개. 관리자는 초안·보관 콘텐츠를 미리보기 띠와 함께 볼 수 있다. */
export default async function CurationDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const preview = viewer.admin;
  const curation = await getCurationBySlug(slug, { preview });
  if (!curation) notFound();

  const [blockSpaces, all, savedIds] = await Promise.all([
    getBlockSpaces(curation.blocks, { preview }),
    listCurations(),
    getSavedEditorialSpaceIds(viewer.userId),
  ]);
  const area = normalizeArea(curation.area);
  // 같은 지역 큐레이션을 먼저, 모자라면 다른 지역으로 채운다.
  const others = all.filter((c) => c.id !== curation.id);
  const related = [...others.filter((c) => area && normalizeArea(c.area) === area), ...others.filter((c) => !area || normalizeArea(c.area) !== area)].slice(0, 2);
  const saveState = { savedIds, loggedIn: viewer.loggedIn };
  const spaces = curation.spaces;
  const dateLabel = formatEditorialDate(curation.publishedAt);

  return (
    <div className="editorial-bleed">
      <PreviewBanner status={curation.status} editHref={`/admin/content/curations/${curation.id}`} />
      <CurationArticle
        backHref={area ? `/curation?area=${encodeURIComponent(area)}` : "/curation"}
        backLabel="CURATION"
        eyebrow={curationEyebrowLine(curation.number, curation.perspective)}
        area={curation.area ?? null}
        title={curation.title}
        summary={curation.summary}
        meta={[curationSpaceCountLabel(spaces.length), dateLabel].filter(Boolean).join(" · ")}
        cover={curation.cover}
        blocks={curation.blocks}
        blockSpaces={blockSpaces}
        spaces={spaces}
        related={related}
        saveState={saveState}
      />
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
