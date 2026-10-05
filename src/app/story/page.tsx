import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import StoryCard, { INDEX_GRID_CLASS, INDEX_GRID_SIZES } from "@/components/editorial/StoryCard";
import TabLinks from "@/components/editorial/TabLinks";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { listStoryItems } from "@/lib/editorial/queries";
import { STORY_TYPE_LABEL, parseStoryType } from "@/lib/editorial/types";

export const metadata: Metadata = {
  title: "STORY — 공간큐브",
  description: "공간을 통해 사람과 생각을 기록합니다.",
};

interface Props {
  searchParams: Promise<{ type?: string }>;
}

/**
 * STORY 허브 — PEOPLE(공간으로 한 사람을 알아가는 이야기)과 THOUGHT(장면에서 시작한 생각)를 함께 보는 매거진 인덱스.
 * 카드 = 대표 이미지 · 라벨 · 제목 · 한 줄. 라벨은 ALL에서만 유형을 붙이고("PEOPLE 001"), PEOPLE · THOUGHT 탭에서는 번호만("001").
 *(StoryCard, 홈 미리보기와 같은 카드). 휴대폰 1열 · 태블릿 2열 · 데스크톱 3열.
 * SPACE는 STORY에 넣지 않는다(공간 발견은 CURATION, 파트너 공간은 함께한 공간).
 */
export default async function StoryHubPage({ searchParams }: Props) {
  const [viewer, { type: typeRaw }] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");

  const type = parseStoryType(typeRaw);
  const all = await listStoryItems();
  const items = type ? all.filter((s) => s.type === type) : all;

  const tabs = [
    { key: "all", label: "ALL", href: "/story" },
    { key: "people", label: "PEOPLE", href: "/story?type=people" },
    { key: "thought", label: "THOUGHT", href: "/story?type=thought" },
  ];

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader title="STORY" description="공간을 통해 사람과 생각을 기록합니다." />
        <div className="ed-container" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <TabLinks tabs={tabs} active={type ?? "all"} label="STORY 유형" />
        </div>
        <section className="ed-container pt-8 md:pt-12">
          {items.length === 0 ? (
            <p className="text-base py-10" style={{ color: "var(--ed-dim)" }}>
              {type ? `첫 번째 ${STORY_TYPE_LABEL[type].en} 이야기를 준비하고 있어요.` : "첫 번째 이야기를 준비하고 있어요."}
            </p>
          ) : (
            <div className={INDEX_GRID_CLASS}>
              {items.map((s, i) => (
                <StoryCard key={s.key} href={s.href} image={s.cover} eyebrow={type ? s.label : s.eyebrow} title={s.title} line={s.summary} ratio="4 / 5" sizes={INDEX_GRID_SIZES} priority={i < 2} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
