import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/editorial/PageHeader";
import SpaceCard from "@/components/editorial/SpaceCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer } from "@/lib/editorial";
import { SPACES } from "@/content/spaces";

export const metadata: Metadata = {
  title: "SPACE — 공간큐브",
  description: "공간큐브가 발견하고 기록한 공간들.",
};

/**
 * 공개 SPACE 목록 — 공간큐브가 발견하고 기록한 공간(src/content/spaces.ts 정적 데이터).
 * Cube 운영 DB의 공간 목록이 아니며, 각 카드는 공개 SPACE 상세(/spaces/[slug])로만 연결된다.
 */
export default async function SpaceListPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) redirect("/");

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader
          label="Space"
          title="SPACE"
          description="이 공간은 누가, 왜, 어떤 생각으로 만들었을까요. 공간큐브가 발견하고 기록한 공간들을 소개합니다."
        />
        <section className="ed-container pt-12 md:pt-16">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-10 md:gap-y-16">
            {SPACES.map((s, i) => (
              <div key={s.slug} className={i % 3 === 1 ? "md:mt-16" : ""}>
                <SpaceCard space={s} ratio={i % 2 === 0 ? "4 / 5" : "1 / 1"} sizes="(min-width: 768px) 33vw, 50vw" showSummary />
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
