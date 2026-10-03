import Link from "next/link";
import Participation from "@/components/editorial/Participation";
import SiteFooter from "@/components/editorial/SiteFooter";
import LatestSlider from "@/components/editorial/LatestSlider";
import EdImage from "@/components/editorial/EdImage";
import CurationCard from "@/components/editorial/CurationCard";
import SpaceCard from "@/components/editorial/SpaceCard";
import { listAreas, listContentStream, listCubeSpaces, listCurations, listStoryItems } from "@/lib/editorial/queries";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import QrScanSheet from "./QrScanSheet";

/* ── 에디토리얼 홈 ───────────────────────────────────────────────────────
   INTRO(브랜드 한 줄) → LATEST(최신 발행 5개 Hero Slider) → 공간 찾기 입구(지역) → STORY · CURATION · 함께한 공간 미리보기(각 2~4개)
   → GONGGANCUBE EXPERIENCE → PARTICIPATE → FOOTER.
   각 영역은 자기 허브(/story, /curation, /cube-spaces)로 넘어가는 입구일 뿐 — 홈에 전부 넣지 않는다.
   노출 규칙은 자동이다: 발행(PUBLISHED)된 콘텐츠를 최신 순으로. 초안 포함 미리보기는 /?preview=drafts(관리자·로컬).
   Cube 운영 DB·라우트(/space/[slug]/** 의 Episode/Scene/방명록)로는 연결하지 않는다.
   서버 컴포넌트 — 클라이언트는 LatestSlider·SaveButton·QrScanSheet뿐이다. ── */

const LATEST_COUNT = 5;

function SectionHead({ label, title, href, cta }: { label: string; title: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-6 pb-6 md:pb-8">
      <div className="space-y-1.5">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{label}</p>
        <h2 className="text-xl md:text-[28px] font-bold leading-[1.25] tracking-[-0.03em] break-keep">{title}</h2>
      </div>
      <Link href={href} className="shrink-0 text-xs md:text-sm font-semibold hover:underline underline-offset-4">{cta} →</Link>
    </div>
  );
}

export default async function EditorialHome({ admin, previewDrafts, userId }: { admin: boolean; previewDrafts: boolean; userId: string | null }) {
  const v = { preview: previewDrafts };
  const [stream, stories, curations, cubeSpaces, savedIds, areas] = await Promise.all([
    listContentStream(v),
    listStoryItems(v),
    listCurations(v),
    listCubeSpaces(v),
    getSavedEditorialSpaceIds(userId),
    listAreas(),
  ]);
  // 보관(ARCHIVED)은 홈에서 항상 제외 — 미리보기도 발행·초안까지만(listContentStream과 같은 규칙).
  const visible = <T extends { status: string }>(rows: T[]) => rows.filter((r) => r.status !== "ARCHIVED");
  const latest = stream.slice(0, LATEST_COUNT);
  const storyPreview = visible(stories).slice(0, 3);
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
          <LatestSlider items={latest} />
        ) : (
          <section className="ed-container py-16">
            <p className="text-base" style={{ color: "var(--ed-dim)" }}>첫 번째 이야기를 준비하고 있습니다.</p>
          </section>
        )}

        {/* ── 공간 찾기 — 지역을 고르면 나에게 맞는 순서로(추천은 찾기의 정렬 순서) ── */}
        {areas.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-8 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Find</p>
                <h2 className="text-xl md:text-[28px] font-bold leading-[1.25] tracking-[-0.03em] break-keep">어디에서 찾으세요?</h2>
                <p className="text-[13px] md:text-sm" style={{ color: "var(--ed-dim)" }}>지역을 고르면 나에게 맞을 가능성이 높은 공간부터 보여드려요.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {areas.slice(0, 5).map((a) => (
                  <Link key={a.area} href={`/find?area=${encodeURIComponent(a.area)}`} className="inline-flex items-center h-10 px-4 text-sm font-semibold" style={{ border: "1px solid var(--ed-fg)" }}>
                    {a.area}
                  </Link>
                ))}
                <Link href="/find" className="inline-flex items-center h-10 px-4 text-sm" style={{ border: "1px solid var(--ed-line)" }}>공간 찾기 →</Link>
              </div>
            </div>
          </section>
        )}

        {/* ── STORY — 사람과 생각을 읽는다 ── */}
        {storyPreview.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-10 md:py-14">
              <SectionHead label="Story · People / Thought" title="공간을 통해 사람과 생각을 읽습니다" href="/story" cta="스토리 더보기" />
              <ul className="ed-scroll-x -mx-5 px-5 scroll-px-5 md:mx-0 md:px-0 md:scroll-px-0 flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory">
                {storyPreview.map((s) => (
                  <li key={s.key} className="snap-start shrink-0 w-[78%] md:w-auto">
                    <Link href={s.href} className="group block">
                      <EdImage image={s.cover} ratio="4 / 5" sizes="(min-width: 768px) 33vw, 78vw" />
                      <p className="pt-4 ed-label" style={{ color: "var(--ed-dim)" }}>{s.eyebrow}</p>
                      <p className="pt-2 text-lg md:text-xl font-bold leading-snug break-keep group-hover:underline underline-offset-4">{s.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── CURATION — 지역을 기본으로 공간을 발견한다 ── */}
        {curationPreview.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-10 md:py-14">
              <SectionHead label="Curation" title="지역에서, 어떤 날과 어떤 마음으로 고른 공간" href="/curation" cta="큐레이션 둘러보기" />
              <ul className="ed-scroll-x -mx-5 px-5 scroll-px-5 md:mx-0 md:px-0 md:scroll-px-0 flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory">
                {curationPreview.map((c) => (
                  <li key={c.id} className="snap-start shrink-0 w-[78%] md:w-auto">
                    <CurationCard c={c} ratio="1 / 1" sizes="(min-width: 768px) 33vw, 78vw" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── 공간큐브와 함께한 공간 — 실제 Cube 파트너 공간 ── */}
        {cubePreview.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-10 md:py-14">
              <SectionHead label="With Gonggancube" title="공간큐브와 함께한 공간" href="/cube-spaces" cta="함께한 공간 보기" />
              <ul className="ed-scroll-x -mx-5 px-5 scroll-px-5 md:mx-0 md:px-0 md:scroll-px-0 flex md:grid md:grid-cols-4 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory">
                {cubePreview.map((s) => (
                  <li key={s.id} className="snap-start shrink-0 w-[60%] md:w-auto">
                    <SpaceCard space={s} sizes="(min-width: 768px) 25vw, 60vw" save={{ saved: savedIds.has(s.id), loggedIn: !!userId }} />
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

        <Participation />
      </main>
      <SiteFooter admin={admin} />
    </div>
  );
}
