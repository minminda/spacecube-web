import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteFooter from "@/components/editorial/SiteFooter";
import PreviewBanner from "@/components/editorial/PreviewBanner";
import StoryArticle from "@/components/editorial/StoryArticle";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getBlockSpaces, getPersonBySlug, listStoryItems } from "@/lib/editorial/queries";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { formatEditorialDate, formatPeopleNumber } from "@/lib/editorial/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPersonBySlug(slug);
  if (!p) return { robots: { index: false } };
  return { title: `${formatPeopleNumber(p.number)} — 공간큐브`, description: p.summary };
}

/** STORY › PEOPLE 상세 — 발행된 것만 공개. 관리자는 초안·보관 콘텐츠를 미리보기 띠와 함께 볼 수 있다. */
export default async function PeopleDetailPage({ params }: Props) {
  const [{ slug }, viewer] = await Promise.all([params, getEditorialViewer()]);
  if (!viewer.editorial) redirect("/");

  const preview = viewer.admin;
  const person = await getPersonBySlug(slug, { preview });
  if (!person) notFound();

  const [blockSpaces, stories, savedIds] = await Promise.all([
    getBlockSpaces(person.blocks, { preview }),
    listStoryItems(),
    getSavedEditorialSpaceIds(viewer.userId),
  ]);
  const related = stories.filter((s) => s.key !== `people-${person.id}`).slice(0, 3);

  return (
    <div className="editorial-bleed">
      <PreviewBanner status={person.status} editHref={`/admin/content/people/${person.id}`} />
      <StoryArticle
        backHref="/story?type=people"
        backLabel="PEOPLE"
        eyebrow={`${formatPeopleNumber(person.number)}${person.subject ? ` · ${person.subject}` : ""}`}
        title={person.title}
        summary={person.summary}
        date={formatEditorialDate(person.publishedAt)}
        cover={person.cover}
        blocks={person.blocks}
        blockSpaces={blockSpaces}
        spaces={person.spaces}
        spacesLabel="이 사람이 머문 공간"
        related={related}
        saveState={{ savedIds, loggedIn: viewer.loggedIn }}
      />
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
