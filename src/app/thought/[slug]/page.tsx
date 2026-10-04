import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import StoryArticle from "@/components/editorial/StoryArticle";
import { thoughtEyebrow } from "@/lib/editorial/draftView";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getBlockSpaces, getThoughtBySlug, listStoryItems } from "@/lib/editorial/queries";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { formatEditorialDate, formatThoughtNumber } from "@/lib/editorial/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getThoughtBySlug(slug);
  if (!p) return { robots: { index: false } };
  return { title: `${formatThoughtNumber(p.number)} — 공간큐브`, description: p.summary };
}

/** STORY › THOUGHT 상세 — 장면 → 경험 → 질문 → 생각의 순서로 읽히는 한 편의 글 — 발행된 것만 공개. 관리자는 초안·보관 콘텐츠를 미리보기 띠와 함께 볼 수 있다. */
export default async function ThoughtDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const preview = viewer.admin;
  const thought = await getThoughtBySlug(slug, { preview });
  if (!thought) notFound();

  const [blockSpaces, stories, savedIds] = await Promise.all([
    getBlockSpaces(thought.blocks, { preview }),
    listStoryItems(),
    getSavedEditorialSpaceIds(viewer.userId),
  ]);
  const related = stories.filter((s) => s.key !== `thought-${thought.id}`).slice(0, 3);

  return (
    <div className="editorial-bleed">
      <PreviewBanner status={thought.status} editHref={`/admin/content/thoughts/${thought.id}`} />
      <StoryArticle
        backHref="/story?type=thought"
        backLabel="THOUGHT"
        eyebrow={thoughtEyebrow(thought.number, thought.scene)}
        title={thought.title}
        summary={thought.summary}
        date={formatEditorialDate(thought.publishedAt)}
        cover={thought.cover}
        blocks={thought.blocks}
        blockSpaces={blockSpaces}
        spaces={thought.spaces}
        spacesLabel="이 생각이 시작된 공간"
        related={related}
        saveState={{ savedIds, loggedIn: viewer.loggedIn }}
      />
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
