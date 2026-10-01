import Link from "next/link";
import Participation from "@/components/editorial/Participation";
import SiteFooter from "@/components/editorial/SiteFooter";
import LatestSlider from "@/components/editorial/LatestSlider";
import ContentFeed from "@/components/editorial/ContentFeed";
import { listContentStream } from "@/lib/editorial/queries";
import QrScanSheet from "./QrScanSheet";

/* ── 에디토리얼 홈 — 하나의 Editorial Content Stream ─────────────────────
   INTRO(한 줄) → LATEST(최신 발행 5개 Hero Slider) → STORIES(ALL/CURATION/PEOPLE/SPACE, 가로 스와이프/6개 그리드)
   → GONGGANCUBE EXPERIENCE → PARTICIPATE(짧은 CTA) → FOOTER. 모바일 세로 길이를 최소화하는 구성.
   노출 규칙은 자동이다: 발행(PUBLISHED)된 콘텐츠를 publishedAt DESC로. 발행만 하면 HOME이 갱신되고,
   별도의 홈 편집은 없다. 초안 포함 미리보기는 관리자(또는 로컬 개발)만 /?preview=drafts로 본다.
   Cube 운영 DB·라우트(/space/[slug]/** 의 Episode/Scene/방명록)로는 연결하지 않는다.
   이 파일은 서버 컴포넌트 — 클라이언트는 LatestSlider·ContentFeed(와 기존 QrScanSheet)뿐이다. ── */

const LATEST_COUNT = 5;

export default async function EditorialHome({ admin, previewDrafts }: { admin: boolean; previewDrafts: boolean }) {
  const stream = await listContentStream({ preview: previewDrafts });
  const latest = stream.slice(0, LATEST_COUNT);

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
            공간을 알면, 머무는 시간이 달라집니다.
          </h1>
        </section>

        {/* ── LATEST ── */}
        {latest.length > 0 ? (
          <LatestSlider items={latest} />
        ) : (
          <section className="ed-container py-16">
            <p className="text-base" style={{ color: "var(--ed-dim)" }}>첫 번째 이야기를 준비하고 있습니다.</p>
          </section>
        )}

        {/* ── STORIES — 가로 스와이프(모바일) / 6개 단위 그리드(데스크톱). 콘텐츠가 늘어도 세로 길이는 일정 ── */}
        {stream.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-8 md:py-12">
              <p className="ed-label pb-3" style={{ color: "var(--ed-fg)" }}>Stories</p>
              <ContentFeed items={stream} />
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
                  온라인에서 공간을 발견하고,
                  <br />
                  현장에서는 공간을 더 깊게 이해합니다.
                </h2>
              </div>
              <ol className="grid grid-cols-5" style={{ borderTop: "1px solid var(--ed-fg)" }}>
                {["SPACE", "VISIT", "CUBE", "STORY", "RECORD"].map((en, i) => (
                  <li key={en} className="pt-3 pr-1 space-y-0.5">
                    <span className="block tabular-nums text-[10px]" style={{ color: "var(--ed-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="block text-[10px] md:text-xs font-bold tracking-[0.04em]">{en}</span>
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
                  더 알아보기 →
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

