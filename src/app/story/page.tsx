import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SiteFooter from "@/components/editorial/SiteFooter";
import StoryList from "@/components/editorial/StoryList";
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
 * STORY 허브 — PEOPLE(공간으로 한 사람을 알아가는 이야기)과 THOUGHT(장면에서 시작한 생각)를 함께 본다.
 * SPACE는 STORY에 넣지 않는다(공간 발견은 CURATION, 파트너 공간은 함께한 공간).
 * 이전 /story/[slug](레거시 ContentStory)는 그대로 두고 이 목록에는 섞지 않는다.
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
        <PageHeader label="Story" title="STORY" description="공간을 통해 사람과 생각을 기록합니다." />
        <div className="ed-container pt-6 md:pt-8" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <TabLinks tabs={tabs} active={type ?? "all"} label="STORY 유형" />
        </div>
        {type && (
          <p className="ed-container pt-6 text-sm leading-relaxed" style={{ color: "var(--ed-dim)" }}>{STORY_TYPE_LABEL[type].description}</p>
        )}
        <section className="ed-container pt-10 md:pt-14">
          {items.length === 0 ? (
            <p className="text-base py-10" style={{ color: "var(--ed-dim)" }}>
              {type ? `첫 번째 ${STORY_TYPE_LABEL[type].en} 이야기를 준비하고 있습니다.` : "첫 번째 이야기를 준비하고 있습니다."}
            </p>
          ) : (
            <StoryList items={items} />
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
