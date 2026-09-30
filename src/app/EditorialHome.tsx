import Link from "next/link";
import CubeGlyph from "@/components/CubeGlyph";
import Participation from "@/components/editorial/Participation";
import SiteFooter from "@/components/editorial/SiteFooter";
import LatestSlider from "@/components/editorial/LatestSlider";
import ContentFeed from "@/components/editorial/ContentFeed";
import { listContentStream } from "@/lib/editorial/queries";
import { BRAND_NAME } from "@/content/site";
import QrScanSheet from "./QrScanSheet";

/* ── 에디토리얼 홈 — 하나의 Editorial Content Stream ─────────────────────
   BRAND INTRO → LATEST(최신 발행 5개 Hero Slider) → CONTENT FEED(ALL/CURATION/PEOPLE/SPACE)
   → MORE → GONGGANCUBE EXPERIENCE → PARTICIPATION → FOOTER.
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
        {/* ── BRAND / INTRO — 짧게. 첫 화면의 주인공은 아래 LATEST 콘텐츠 ── */}
        <section className="ed-container pt-10 pb-4 md:pt-14 md:pb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h1 className="text-[28px] leading-[1.25] md:text-[40px] md:leading-[1.2] font-bold tracking-[-0.03em]">
              공간을 알면,
              <br className="md:hidden" /> 머무는 시간이 달라집니다.
            </h1>
            <p className="text-sm md:text-base" style={{ color: "var(--ed-dim)" }}>
              {BRAND_NAME} — 공간과 그곳을 만든 사람들의 이야기를 기록합니다.
            </p>
          </div>
        </section>

        {/* ── LATEST ── */}
        {latest.length > 0 ? (
          <LatestSlider items={latest} />
        ) : (
          <section className="ed-container py-16">
            <p className="text-base" style={{ color: "var(--ed-dim)" }}>첫 번째 이야기를 준비하고 있습니다.</p>
          </section>
        )}

        {/* ── CONTENT FEED ── */}
        {stream.length > 0 && (
          <section style={{ borderTop: "1px solid var(--ed-line)" }}>
            <div className="ed-container py-14 md:py-20">
              <div className="mb-8 md:mb-10 space-y-3">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Stories</p>
                <h2 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">공간 · 사람 · 지역의 이야기</h2>
              </div>
              <ContentFeed items={stream} />

              {/* ── MORE — 유형별 전체 보기 ── */}
              <div className="mt-16 md:mt-20 grid gap-px md:grid-cols-3" style={{ background: "var(--ed-line)", border: "1px solid var(--ed-line)" }}>
                {[
                  { href: "/curation", label: "CURATION", desc: "지역 하나를 하나의 관점으로" },
                  { href: "/people", label: "PEOPLE", desc: "공간을 통해 한 사람을" },
                  { href: "/spaces", label: "SPACE", desc: "공간큐브가 발견한 공간들" },
                ].map((m) => (
                  <Link key={m.href} href={m.href} className="group flex items-center justify-between gap-4 px-6 py-6 transition-colors hover:bg-[var(--ed-soft)]" style={{ background: "var(--ed-bg)" }}>
                    <span>
                      <span className="block ed-label">{m.label}</span>
                      <span className="block mt-1.5 text-sm" style={{ color: "var(--ed-dim)" }}>{m.desc}</span>
                    </span>
                    <span aria-hidden className="text-lg transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── GONGGANCUBE EXPERIENCE — 온라인 발견 → 실제 방문 → Cube를 통한 깊은 경험 ── */}
        <section style={{ background: "var(--ed-soft)" }}>
          <div className="ed-container py-16 md:py-24 grid gap-12 md:grid-cols-12 md:gap-12 md:items-center">
            <div className="md:col-span-5">
              {/* 실제 큐브 사진이 준비되면 이 도형 자리를 사진으로 교체한다 */}
              <div className="relative w-full flex items-center justify-center" style={{ aspectRatio: "1 / 1", background: "#fff" }}>
                <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" style={{ color: "var(--ed-fg)" }} aria-label="공간큐브 큐브">
                  <CubeGlyph outlineWidth={0.45} edgeWidth={0.4} />
                </svg>
                <p className="absolute bottom-4 left-4 ed-label" style={{ color: "var(--ed-dim)" }}>{BRAND_NAME}</p>
              </div>
            </div>
            <div className="md:col-span-7 space-y-10">
              <div className="space-y-4">
                <p className="ed-label" style={{ color: "var(--ed-dim)" }}>Gonggancube Experience</p>
                <h2 className="text-3xl md:text-[44px] font-bold leading-[1.2] tracking-[-0.03em]">
                  온라인에서 공간을 발견하고,
                  <br />
                  현장에서는 공간을 더 깊게 이해합니다.
                </h2>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ed-dim)" }}>
                  공간에 놓인 큐브의 QR을 스캔하면, 온라인에서는 읽을 수 없는
                  <br className="hidden md:block" /> 그 공간을 만든 사람의 이야기가 열리고 당신의 이야기를 남길 수 있어요.
                </p>
              </div>
              <ol className="grid grid-cols-5" style={{ borderTop: "1px solid var(--ed-fg)" }}>
                {[
                  { en: "SPACE", ko: "발견" },
                  { en: "VISIT", ko: "방문" },
                  { en: "CUBE", ko: "QR 스캔" },
                  { en: "STORY", ko: "이야기" },
                  { en: "GUESTBOOK", ko: "기록" },
                ].map((s, i) => (
                  <li key={s.en} className="pt-4 pr-2 space-y-1">
                    <span className="block tabular-nums text-[11px]" style={{ color: "var(--ed-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="block text-[11px] md:text-sm font-bold tracking-[0.06em] break-all">{s.en}</span>
                    <span className="block text-[11px] md:text-xs" style={{ color: "var(--ed-dim)" }}>{s.ko}</span>
                  </li>
                ))}
              </ol>
              <div className="max-w-sm space-y-3">
                <QrScanSheet />
                <Link
                  href="/about"
                  className="tap-target flex items-center justify-center w-full text-sm font-semibold border transition-colors hover:bg-white"
                  style={{ borderColor: "var(--ed-fg)" }}
                >
                  공간큐브 알아보기 →
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

