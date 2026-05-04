import Link from "next/link";
import type { Metadata } from "next";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "공간큐브 소개",
  description: "공간을 기록하고, 그 기록을 통해 자신의 취향을 발견하는 서비스",
};

const content = {
  ko: {
    back: "← 홈",
    label: "공간큐브",
    badge: "ABOUT",

    def_label: "공간큐브란",
    def: "공간을 기록하고,\n그 기록을 통해 자신의 취향을 발견하는 서비스.",

    problem_label: "우리가 놓치는 것",
    problem: "우리는 많은 공간을 경험한다.\n카페에서 보낸 오후, 처음 들어간 서점, 우연히 발견한 작은 식당.\n\n하지만 그 공간과 그때의 감정을,\n우리는 너무 쉽게 잊는다.",

    limit_label: "기존 방식의 한계",
    limit: "리뷰, 평점, 검색 중심의 서비스에서\n공간은 소비의 대상이다.\n\n“어디가 맛있어?” “몇 점이야?”\n\n그 물음으로는 공간의 의미도,\n나의 취향도 알기 어렵다.",

    how_label: "공간큐브가 다른 방식",
    how: "공간 안에 작은 큐브가 놓여 있다.\n\nQR을 스캔하면 그 공간의 이야기가 열린다.\n기획자의 의도, 공간의 철학, 오너의 메시지.\n\n정보가 아니라 맥락이다.",

    flow_label: "경험의 흐름",
    flow: [
      "공간 방문",
      "큐브 발견",
      "QR 스캔",
      "공간 이야기",
      "기록",
      "취향 발견",
    ],

    diff_label: "핵심 차별점",
    diff: "공간큐브는 공간을 추천하는 서비스가 아니다.\n\n공간을 이해하고,\n그 이해를 기록하는 서비스다.\n\n당신이 무엇을 좋아하는지는,\n당신이 어떤 공간에 감동받았는지에 담겨 있다.",

    closing_label: "공간큐브는",
    closing: "공간을 소비하는 서비스가 아니라\n공간을 이해하는 경험이다.",

    cta: "공간 둘러보기 →",
    cta_href: "/discover",
  },
  en: {
    back: "← Home",
    label: "SpaceCube",
    badge: "ABOUT",

    def_label: "What is SpaceCube",
    def: "A service to record your space experiences\nand discover your own taste through those records.",

    problem_label: "What we tend to forget",
    problem: "We experience many spaces.\nAn afternoon at a café, a bookstore we stumbled into, a small restaurant found by chance.\n\nBut the feeling of being in those spaces —\nwe forget it all too easily.",

    limit_label: "The limits of existing services",
    limit: "In review- and rating-based services,\nspaces are objects of consumption.\n\n“Where’s good?” “What’s the rating?”\n\nThose questions can’t tell you what a space means —\nor what your taste actually is.",

    how_label: "How SpaceCube is different",
    how: "A small cube sits inside the space.\n\nScan the QR and the story of that space opens up.\nThe creator's intent, the space's philosophy, the owner's message.\n\nNot information — context.",

    flow_label: "The flow of experience",
    flow: [
      "Visit the space",
      "Find the cube",
      "Scan QR",
      "Read the story",
      "Record",
      "Discover your taste",
    ],

    diff_label: "What makes it different",
    diff: "SpaceCube is not a recommendation service.\n\nIt is a service for understanding spaces\nand recording that understanding.\n\nWhat you love is embedded\nin which spaces moved you.",

    closing_label: "SpaceCube is",
    closing: "Not a service to consume spaces —\nbut an experience to understand them.",

    cta: "Explore spaces →",
    cta_href: "/discover",
  },
};

export default async function AboutPage() {
  const lang = await getLang();
  const t = lang === "ko" ? content.ko : content.en;

  return (
    <main className="flex flex-col min-h-screen">
      {/* 네비 */}
      <div className="flex items-center justify-between px-6 pt-10 pb-6">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>{t.back}</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.label}</p>
        <span className="text-xs" style={{ color: "var(--border)" }}>{t.badge}</span>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ① 한 줄 정의 */}
      <section className="px-6 py-12 space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.def_label}</p>
        <p className="text-xl font-bold leading-snug whitespace-pre-line">{t.def}</p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ② 문제 제기 */}
      <section className="px-6 py-10 space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.problem_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>{t.problem}</p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ③ 기존 방식 한계 */}
      <section className="px-6 py-10 space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.limit_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>{t.limit}</p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ④ 공간큐브 방식 */}
      <section className="px-6 py-10 space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.how_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line">{t.how}</p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑤ 경험 흐름 */}
      <section className="px-6 py-10 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.flow_label}</p>
        <ol className="space-y-0">
          {t.flow.map((step, i) => (
            <li key={i} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <span
                  className="w-5 h-5 flex-shrink-0 border flex items-center justify-center text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {i + 1}
                </span>
                {i < t.flow.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: "var(--border)", minHeight: "1.5rem" }} />
                )}
              </div>
              <p className={`text-sm pt-0.5 pb-4 ${i === t.flow.length - 1 ? "font-semibold" : ""}`}
                style={{ color: i === t.flow.length - 1 ? "var(--fg)" : "var(--dim)" }}>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑥ 핵심 차별점 */}
      <section className="px-6 py-10 space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.diff_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line">{t.diff}</p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑦ 마무리 */}
      <section className="px-6 py-12 space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.closing_label}</p>
        <p
          className="text-lg font-bold leading-snug whitespace-pre-line pl-3"
          style={{ borderLeft: "2px solid var(--fg)" }}
        >
          {t.closing}
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* CTA */}
      <div className="px-6 py-10">
        <Link
          href={t.cta_href}
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          {t.cta}
        </Link>
      </div>
    </main>
  );
}
