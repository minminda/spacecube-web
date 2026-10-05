import Link from "next/link";
import SiteFooter from "@/components/editorial/SiteFooter";
import LatestSlider from "@/components/editorial/LatestSlider";
import StoryCard, { INDEX_GRID_CLASS, INDEX_GRID_SIZES } from "@/components/editorial/StoryCard";
import { SPACE_GRID_CLASS } from "@/components/editorial/SpaceTile";
import CurationCard from "@/components/editorial/CurationCard";
import SpaceCard from "@/components/editorial/SpaceCard";
import { listContentStream, listCubeSpaces, listCurations, listStoryItems } from "@/lib/editorial/queries";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { STORY_TYPE_LABEL, type StoryItem } from "@/lib/editorial/types";
import QrScanSheet from "./QrScanSheet";

/* ── 에디토리얼 홈 ───────────────────────────────────────────────────────
   INTRO(브랜드 한 줄) → LATEST(최신 발행 5개 Hero Slider, 전체는 /latest) → CURATION → STORY(PEOPLE / THOUGHT) → 함께한 공간
   → GONGGANCUBE EXPERIENCE → FOOTER.
   홈은 "공간큐브가 지금 무엇을 발견하고 기록하는지" 보여주는 콘텐츠 중심 — 추천(/find)·내 아카이브는 홈 섹션이 아니라
   Navbar의 핵심 Action이다. 공간 제안하기는 푸터(유틸리티)에서만 받는다.
   LATEST · CURATION · STORY는 발행 콘텐츠가 0편이어도 섹션 자체는 남기고 준비 중 문구를 보여준다(홈의 뼈대).
   각 영역은 자기 허브(/story, /curation, /cube-spaces)로 넘어가는 입구일 뿐 — 홈에 전부 넣지 않는다.
   노출 규칙은 자동이다: 발행(PUBLISHED)된 콘텐츠를 최신 순으로. 초안 포함 미리보기는 /?preview=drafts(관리자·로컬).
   Cube 운영 DB·라우트(/space/[slug]/** 의 Episode/Scene/방명록)로는 연결하지 않는다.
   서버 컴포넌트 — 클라이언트는 LatestSlider·SaveButton·QrScanSheet뿐이다. ── */

const LATEST_COUNT = 5;

/** 섹션 머리 — 섹션 제목(.ed-section-title)을 크게, 설명은 그 아래 작고 흐리게(.ed-section-desc), 오른쪽에 허브 링크. */
function SectionHead({ title, description, href, cta }: { title: string; description?: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-6 pb-5 md:pb-8">
      <div className="min-w-0">
        <h2 className="ed-section-title">{title}</h2>
        {description && <p className="ed-section-desc pt-1.5 md:pt-2">{description}</p>}
      </div>
      <Link href={href} className="shrink-0 text-xs md:text-sm font-semibold hover:underline underline-offset-4">{cta} →</Link>
    </div>
  );
}

/** STORY 안의 하위 구획(PEOPLE · THOUGHT) — 구획 제목이 유형을 말하므로 카드는 번호만("001"). */
function StorySubsection({ title, items }: { title: string; items: StoryItem[] }) {
  return (
    <div>
      <h3 className="ed-subsection-title pb-3 md:pb-5">{title}</h3>
      <ul className={INDEX_GRID_CLASS}>
        {items.map((s) => (
          <li key={s.key} className="min-w-0">
            <StoryCard href={s.href} image={s.cover} eyebrow={s.label} title={s.title} line={s.summary} ratio="4 / 5" sizes={INDEX_GRID_SIZES} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function EditorialHome({ admin, previewDrafts, userId }: { admin: boolean; previewDrafts: boolean; userId: string | null }) {
  const v = { preview: previewDrafts };
  const [stream, stories, curations, cubeSpaces, savedIds] = await Promise.all([
    listContentStream(v),
    listStoryItems(v),
    listCurations(v),
    listCubeSpaces(v),
    getSavedEditorialSpaceIds(userId),
  ]);
  // 보관(ARCHIVED)은 홈에서 항상 제외 — 미리보기도 발행·초안까지만(listContentStream과 같은 규칙).
  const visible = <T extends { status: string }>(rows: T[]) => rows.filter((r) => r.status !== "ARCHIVED");
  const latest = stream.slice(0, LATEST_COUNT);
  // STORY는 PEOPLE · THOUGHT를 한 그리드에 섞지 않는다 — 각각 최신 3편, 0편인 쪽은 구획째 숨긴다.
  const storyGroups = (["people", "thought"] as const)
    .map((type) => ({ type, items: visible(stories).filter((s) => s.type === type).slice(0, 3) }))
    .filter((g) => g.items.length > 0);
  const curationPreview = visible(curations).slice(0, 3);
  const cubePreview = visible(cubeSpaces).slice(0, 4);

  return (
    <div className="editorial-bleed">
      {previewDrafts && (
        <div className="sticky top-14 z-40" style={{ background: "#fff6e6", borderBottom: "1px solid #f0dcb0" }}>
          <p className="ed-container py-2.5 text-xs" style={{ color: "#8a5a00" }}>
            <strong className="font-semibold">미리보기 · 초안 포함</strong>
            <span className="ml-2">초안 콘텐츠가 함께 표시됩니다. 일반 방문자에게는 발행된 콘텐츠만 보여요.</span>
            <Link href="/" className="ml-3 underline underline-offset-4">발행본만 보기</Link>
          </p>
        </div>
      )}
      <main>
        {/* ── BRAND / INTRO — 한 줄 수준으로 압축. 첫 화면의 주인공은 아래 LATEST 콘텐츠 ── */}
        <section className="ed-container pt-6 pb-1 md:pt-10 md:pb-2">
          <h1 className="text-xl leading-[1.3] md:text-[32px] md:leading-[1.2] font-bold tracking-[-0.03em] break-keep">
            공간을 발견하는 시간도 경험이 될 수 있도록.
          </h1>
          <p className="mt-1.5 text-[13px] md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>
            사람과 공간의 이야기를 읽고, 언젠가 가보고 싶은 장소를 발견합니다.
          </p>
        </section>

        {/* ── LATEST ── */}
        {latest.length > 0 ? (
          <LatestSlider items={latest} allHref="/latest" />
        ) : (
          <section className="ed-container py-10">
            <h2 className="ed-section-title pb-3" style={{ borderBottom: "1px solid var(--ed-fg)" }}>LATEST</h2>
            <p className="pt-6 text-base" style={{ color: "var(--ed-dim)" }}>첫 번째 이야기를 준비하고 있어요.</p>
          </section>
        )}

        {/* ── CURATION — 공간큐브가 지역 × 상황/목적으로 직접 고른 공간 ── */}
        <section style={{ borderTop: "1px solid var(--ed-line)" }}>
          <div className="ed-container py-10 md:py-14">
            <SectionHead title="CURATION" description="지역에서, 어떤 날과 어떤 마음으로 고른 공간" href="/curation" cta="큐레이션 보기" />
            {curationPreview.length === 0 ? (
              <p className="py-4 text-sm" style={{ color: "var(--ed-dim)" }}>첫 번째 큐레이션을 준비하고 있어요.</p>
            ) : (
              <ul className={INDEX_GRID_CLASS}>
                {curationPreview.map((c) => (
                  <li key={c.id} className="min-w-0"><CurationCard c={c} /></li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── STORY — PEOPLE(위) / THOUGHT(아래), 공간을 통해 사람과 생각을 읽는다 ── */}
        <section style={{ borderTop: "1px solid var(--ed-line)" }}>
          <div className="ed-container py-10 md:py-14">
            <SectionHead title="STORY" description="공간을 통해 사람과 생각을 읽습니다" href="/story" cta="스토리 보기" />
            {storyGroups.length === 0 ? (
              <p className="py-4 text-sm" style={{ color: "var(--ed-dim)" }}>첫 번째 이야기를 준비하고 있어요.</p>
            ) : (
              <div className="flex flex-col gap-10 md:gap-14">
                {storyGroups.map((g) => (
                  <StorySubsection key={g.type} title={STORY_TYPE_LABEL[g.type].en} items={g.items} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 공간큐브와 함께한 공간 — 실제 Cube 파트너 공간 ── */}
        {cubePreview.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-10 md:py-14">
              <SectionHead title="함께한 공간" description="현장에 Cube가 있는 공간" href="/cube-spaces" cta="함께한 공간 보기" />
              <ul className={SPACE_GRID_CLASS}>
                {cubePreview.map((s) => (
                  <li key={s.id} className="min-w-0">
                    <SpaceCard space={s} save={{ saved: savedIds.has(s.id), loggedIn: !!userId }} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── GONGGANCUBE EXPERIENCE — 짧게: 핵심 한 문장 + 5단계 + 링크 ── */}
        <section style={{ background: "var(--ed-soft)" }}>
          <div className="ed-container py-8 md:py-12 grid gap-6 md:grid-cols-12 md:gap-12 md:items-center">
            <div className="md:col-span-7 space-y-5">
              <div className="space-y-2">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Gonggancube Experience</p>
                <h2 className="text-xl md:text-[32px] font-bold leading-[1.3] tracking-[-0.03em] break-keep">
                  좋은 공간을 발견했다면,
                  <br />
                  언젠가 직접 만나보세요.
                </h2>
              </div>
              <ol className="grid grid-cols-5" style={{ borderTop: "1px solid var(--ed-fg)" }}>
                {["DISCOVER", "SAVE", "VISIT", "CUBE", "RECORD"].map((en, i) => (
                  <li key={en} className="pt-3 pr-1 space-y-0.5">
                    <span className="block tabular-nums text-[10px]" style={{ color: "var(--ed-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="block text-[10px] md:text-xs font-bold tracking-[0.02em]">{en}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="md:col-span-5 flex flex-col gap-3 md:items-end">
              <div className="w-full max-w-sm space-y-3">
                <QrScanSheet />
                <Link
                  href="/about"
                  className="tap-target flex items-center justify-center w-full text-sm font-semibold border transition-colors hover:bg-white"
                  style={{ borderColor: "var(--ed-fg)" }}
                >
                  공간큐브 소개 →
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter admin={admin} />
    </div>
  );
}
