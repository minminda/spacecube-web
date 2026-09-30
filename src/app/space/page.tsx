import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer, getSpacesBySlugs } from "@/lib/editorial";
import { FEATURED_SPACE_SLUGS } from "@/content/site";

export const metadata: Metadata = {
  title: "SPACE — 공간큐브",
  description: "이 공간은 누가, 왜, 어떤 생각으로 만들었을까요.",
};

/**
 * SPACE 목록 — 기존 공간 상세(/space/[slug])로 연결되는 에디토리얼 목록.
 * 파일럿 기간 공개 공간 목록(/discover) 비공개 정책을 유지하기 위해 DB 전체가 아니라
 * FEATURED_SPACE_SLUGS에 적힌 공간만 보여준다(src/content/site.ts).
 */
export default async function SpaceListPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) redirect("/");

  const spaces = await getSpacesBySlugs(FEATURED_SPACE_SLUGS);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader
          label="Space"
          title="SPACE"
          description="이 공간은 누가, 왜, 어떤 생각으로 만들었을까요. 공간을 만든 사람의 이야기는 공간에 놓인 큐브를 통해 열립니다."
        />
        <section className="ed-container pt-12 md:pt-16">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-10 md:gap-y-16">
            {spaces.map((s, i) => (
              <div key={s.slug} className={i % 3 === 1 ? "md:mt-16" : ""}>
                <SpaceCard space={s} ratio={i % 2 === 0 ? "4 / 5" : "1 / 1"} sizes="(min-width: 768px) 33vw, 50vw" showTagline />
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
