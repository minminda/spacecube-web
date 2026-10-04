import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import CurationCard from "@/components/editorial/CurationCard";
import SpaceCard from "@/components/editorial/SpaceCard";
import { SPACE_GRID_CLASS } from "@/components/editorial/SpaceTile";
import { INDEX_GRID_CLASS } from "@/components/editorial/StoryCard";
import SiteFooter from "@/components/editorial/SiteFooter";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { listCubeSpaces, listCurations, listStoryItems } from "@/lib/editorial/queries";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";

export const metadata: Metadata = {
  title: "공간큐브가 하는 일 — 공간큐브",
  description: "공간과 사람의 이야기를 기록하고, 직접 경험할 수 있는 방법을 만듭니다.",
};

function SectionHead({ label, title, body, href, cta }: { label: string; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-12 md:items-end pb-6 md:pb-8">
      <div className="md:col-span-7 space-y-2">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{label}</p>
        <h2 className="text-2xl md:text-[36px] font-bold leading-[1.15] tracking-[-0.03em] break-keep">{title}</h2>
        <p className="text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>{body}</p>
      </div>
      <div className="md:col-span-5 md:text-right">
        <Link href={href} className="text-sm font-semibold hover:underline underline-offset-4">{cta} →</Link>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-sm" style={{ color: "var(--ed-dim)" }}>{text}</p>;
}

/**
 * 공간큐브 브랜드 허브 — 공간큐브가 직접 하는 일(STORY · 공식 CURATION · 함께한 공간 · Cube 경험)을 한곳에서 보여준다.
 * 별도 서비스가 아니다 — 같은 콘텐츠가 홈과 상단 메뉴에도 그대로 있고, 이 페이지는 브랜드 입장에서 모아 보여줄 뿐이다.
 * 기존 경로(/story, /curation, /cube-spaces)는 그대로다.
 * 공개 정책은 다른 새 정보구조 페이지와 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기). 그 전에는 기존 소개(/about)로.
 */
export default async function SpaceCubeBrandHubPage() {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) redirect("/about");

  const [stories, curations, cubeSpaces, savedIds] = await Promise.all([
    listStoryItems(),
    listCurations(),
    listCubeSpaces(),
    getSavedEditorialSpaceIds(viewer.userId),
  ]);
  const storyPreview = stories.slice(0, 3);
  const curationPreview = curations.slice(0, 3);
  const cubePreview = cubeSpaces.slice(0, 4);

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        {/* Hero — 기존 브랜드 톤 그대로 */}
        <header className="ed-container pt-12 pb-10 md:pt-20 md:pb-16" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7 space-y-4">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>About Gonggancube</p>
              <h1 className="text-[44px] md:text-[72px] font-bold leading-none tracking-[-0.04em]">공간큐브</h1>
            </div>
            <p className="md:col-span-5 text-base md:text-lg leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
              공간과 사람의 이야기를 기록하고,
              <br />
              직접 경험할 수 있는 방법을 만듭니다.
            </p>
          </div>
        </header>

        {/* STORY */}
        <section className="ed-container pt-12 md:pt-16">
          <SectionHead label="Story · People / Thought" title="사람과 공간에서 시작된 이야기" body="한 사람이 머무는 공간(PEOPLE), 하나의 장면에서 시작한 생각(THOUGHT)을 기록합니다." href="/story" cta="스토리 보기" />
          {storyPreview.length === 0 ? (
            <Empty text="첫 번째 이야기를 준비하고 있습니다." />
          ) : (
            <ul className="grid gap-8 md:grid-cols-3">
              {storyPreview.map((s) => (
                <li key={s.key}>
                  <Link href={s.href} className="group block">
                    <EdImage image={s.cover} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 100vw" />
                    <p className="pt-4 ed-label" style={{ color: "var(--ed-dim)" }}>{s.eyebrow}</p>
                    <p className="pt-2 text-lg font-bold leading-snug break-keep group-hover:underline underline-offset-4">{s.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* CURATION */}
        <section className="ed-container pt-16 md:pt-24">
          <div style={{ borderTop: "1px solid var(--ed-line)" }} className="pt-12 md:pt-16">
            <SectionHead label="Curation" title="공간큐브가 직접 고른 공간" body="지역을 기본으로, 어떤 날의 상황(지역 × 상황)이나 하고 싶은 것(지역 × 취향·목적)에서 출발해 공간을 묶습니다." href="/curation" cta="큐레이션 보기" />
            {curationPreview.length === 0 ? (
              <Empty text="첫 번째 큐레이션을 준비하고 있습니다." />
            ) : (
              <div className={INDEX_GRID_CLASS}>
                {curationPreview.map((c) => <CurationCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        </section>

        {/* 함께한 공간 */}
        <section className="ed-container pt-16 md:pt-24">
          <div style={{ borderTop: "1px solid var(--ed-line)" }} className="pt-12 md:pt-16">
            <SectionHead label="With Gonggancube" title="함께한 공간" body="공간큐브가 실제로 만나고 함께 이야기한 공간들. 이곳들에는 현장에 Cube가 있어요." href="/cube-spaces" cta="함께한 공간 보기" />
            {cubePreview.length === 0 ? (
              <Empty text="함께한 공간을 준비하고 있습니다." />
            ) : (
              <div className={SPACE_GRID_CLASS}>
                {cubePreview.map((s) => (
                  <SpaceCard key={s.id} space={s} save={{ saved: savedIds.has(s.id), loggedIn: viewer.loggedIn }} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CUBE EXPERIENCE — 짧게 */}
        <section className="mt-16 md:mt-24" style={{ background: "var(--ed-soft)" }}>
          <div className="ed-container py-12 md:py-16 grid gap-8 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7 space-y-3">
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Cube Experience</p>
              <h2 className="text-2xl md:text-[32px] font-bold leading-[1.25] tracking-[-0.03em] break-keep">공간에서 만나는 CUBE</h2>
              <p className="text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
                웹에서는 공간의 전체 이야기를 읽고, 실제 공간에서는 그 장소에 있어야 의미 있는 작은 이야기를 만납니다.
              </p>
              <ol className="grid grid-cols-4 pt-3" style={{ borderTop: "1px solid var(--ed-fg)" }}>
                {[["CUBE", "QR 인식"], ["STORY", "1~2분 현장 이야기"], ["GUESTBOOK", "방문자의 흔적"], ["ARCHIVE", "내 기록으로"]].map(([en, ko], i) => (
                  <li key={en} className="pt-3 pr-2 space-y-0.5">
                    <span className="block tabular-nums text-[10px]" style={{ color: "var(--ed-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="block text-[11px] md:text-xs font-bold">{en}</span>
                    <span className="block text-[10px] md:text-xs break-keep" style={{ color: "var(--ed-dim)" }}>{ko}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="md:col-span-5 md:text-right">
              <Link href="/about" className="tap-target inline-flex items-center px-5 text-sm font-semibold" style={{ border: "1px solid var(--ed-fg)" }}>
                공간큐브 소개 →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
