import Link from "next/link";
import type { Metadata } from "next";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "공간큐브 소개",
  description: "공간 경험을 기록하고, 그 기록을 통해 자신의 취향을 발견하는 서비스입니다.",
};

const content = {
  ko: {
    back: "← 홈",
    label: "공간큐브",
    badge: "ABOUT",

    // ① Hero
    hero_label: "공간큐브는",
    hero: "공간 경험을 기록하고,\n그 기록을 통해 자신의 취향을 발견하는 서비스입니다.",
    hero_subs: [
      "작은 문화공간의 이야기와 철학을 발견합니다.",
      "공간을 단순 정보가 아닌 경험으로 기록합니다.",
      "취향이 비슷한 공간들을 천천히 연결합니다.",
    ],

    // ② 왜 만들었나
    why_label: "왜 공간큐브를 만들었는가",
    why_problem_label: "현재 공간 플랫폼은",
    why_problem: [
      "리뷰, 평점, 인기순, 빠른 소비 중심으로 움직입니다.",
      "이미 유명한 공간만 반복 노출됩니다.",
      "공간의 철학은 전달되지 않습니다.",
      "사용자는 공간보다 정보만 소비하게 됩니다.",
    ],
    why_insight: "사람들은 많은 공간을 경험하지만,\n시간이 지나면 그 공간과 자신의 취향을 잊어버립니다.\n\n우리는 공간을 검색하고 소비하지만,\n왜 그 공간이 좋았는지는 남기지 못합니다.",

    // ③ 공간큐브가 중요하게 생각하는 공간
    space_label: "공간큐브가 기록하는 공간",
    space_desc: "공간큐브는 운영자의 취향과 철학이 담긴 작은 문화공간들을 기록합니다.\n단순히 유명한 공간보다, 공간만의 결이 느껴지는 곳을 중요하게 생각합니다.",
    space_examples: [
      "독립서점",
      "작은 전시공간",
      "LP바",
      "조용한 카페",
      "소품샵",
      "복합문화공간",
    ],

    // ④ 경험 흐름
    flow_label: "경험의 흐름",
    flow_desc: "공간큐브는 기록을 강요하지 않습니다.\n사람은 기록하기 위해 공간에 가는 것이 아니라,\n공간을 경험하기 위해 방문합니다.\n기록은 경험 이후 자연스럽게 남습니다.",
    flow: [
      "공간 발견",
      "큐브 발견",
      "QR 스캔",
      "공간 이야기",
      "짧은 기록",
      "취향 축적",
      "다음 공간 탐험",
    ],

    // ⑤ 오브젝트
    obj_label: "공간큐브 오브젝트",
    obj: "공간큐브는 단순한 QR 코드가 아닙니다.\n각 공간에 하나씩 놓이는 작은 오브젝트이며,\n그 공간의 이야기로 들어가는 입구 역할을 합니다.",
    obj_roles: [
      "공간의 중심",
      "발견의 신호",
      "탐험의 시작점",
    ],

    // ⑥ 연결
    connect_label: "공간큐브가 지향하는 연결",
    connect: "공간큐브는 사람을 팔로우하는 서비스가 아닙니다.\n공간을 통해 취향을 발견하고,\n그 취향을 따라 다른 공간으로 이어지는 경험을 만듭니다.",
    connect_no: ["리뷰 경쟁", "별점", "인기순"],
    connect_yes: ["기록", "감정", "탐험", "취향"],

    // ⑦ 마무리
    closing_label: "공간큐브는",
    closing: "취향은 설명보다 경험 속에서 드러난다고 믿습니다.",

    cta: "공간 둘러보기 →",
    cta_href: "/discover",
  },
  en: {
    back: "← Home",
    label: "SpaceCube",
    badge: "ABOUT",

    hero_label: "SpaceCube is",
    hero: "A service to record your space experiences\nand discover your own taste through those records.",
    hero_subs: [
      "Discover the stories and philosophy of small cultural spaces.",
      "Record spaces not as information, but as experiences.",
      "Slowly connect spaces of similar taste.",
    ],

    why_label: "Why we built SpaceCube",
    why_problem_label: "Current space platforms are built around",
    why_problem: [
      "Reviews, ratings, popularity, and fast consumption.",
      "Already-famous spaces get repeated exposure.",
      "The philosophy of a space is never conveyed.",
      "Users end up consuming information, not spaces.",
    ],
    why_insight: "People experience many spaces,\nbut over time they forget those spaces — and their own taste.\n\nWe search for and consume spaces,\nbut never record why a space moved us.",

    space_label: "Spaces SpaceCube records",
    space_desc: "SpaceCube records small cultural spaces where the owner's taste and philosophy are present.\nWe care less about what's famous, and more about what has a distinct character.",
    space_examples: [
      "Independent bookstores",
      "Small exhibition spaces",
      "LP bars",
      "Quiet cafés",
      "Object shops",
      "Mixed cultural spaces",
    ],

    flow_label: "The flow of experience",
    flow_desc: "SpaceCube does not demand that you record.\nPeople don't visit spaces to record them —\nthey visit to experience them.\nThe record comes naturally afterward.",
    flow: [
      "Discover a space",
      "Find the cube",
      "Scan QR",
      "Read the story",
      "Leave a short record",
      "Accumulate taste",
      "Explore the next space",
    ],

    obj_label: "The SpaceCube object",
    obj: "SpaceCube is not just a QR code.\nIt is a small object placed inside each space,\nserving as the entrance into that space's story.",
    obj_roles: [
      "The center of the space",
      "A signal of discovery",
      "The starting point of exploration",
    ],

    connect_label: "The connection SpaceCube seeks",
    connect: "SpaceCube is not a service for following people.\nIt creates an experience of discovering your taste through spaces,\nand following that taste to the next space.",
    connect_no: ["Review competition", "Star ratings", "Popularity ranking"],
    connect_yes: ["Records", "Emotions", "Exploration", "Taste"],

    closing_label: "SpaceCube believes",
    closing: "Taste reveals itself through experience, not explanation.",

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

      {/* ① Hero */}
      <section className="px-6 py-14 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.hero_label}</p>
        <p className="text-xl font-bold leading-snug whitespace-pre-line">{t.hero}</p>
        <ul className="space-y-2 pt-2">
          {t.hero_subs.map((s, i) => (
            <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
              · {s}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ② 왜 만들었나 */}
      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.why_label}</p>
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>{t.why_problem_label}</p>
          <ul className="space-y-1.5">
            {t.why_problem.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed pl-3" style={{ color: "var(--dim)", borderLeft: "1px solid var(--border)" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm leading-loose whitespace-pre-line">{t.why_insight}</p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ③ 공간큐브가 기록하는 공간 */}
      <section className="px-6 py-12 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.space_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>{t.space_desc}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {t.space_examples.map((ex, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 border"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              {ex}
            </span>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ④ 경험 흐름 */}
      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.flow_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>{t.flow_desc}</p>
        <ol className="space-y-0 pt-2">
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
              <p
                className={`text-sm pt-0.5 pb-4 ${i === t.flow.length - 1 ? "font-semibold" : ""}`}
                style={{ color: i === t.flow.length - 1 ? "var(--fg)" : "var(--dim)" }}
              >
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑤ 오브젝트 */}
      <section className="px-6 py-12 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.obj_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line">{t.obj}</p>
        <ul className="space-y-1.5 pt-1">
          {t.obj_roles.map((role, i) => (
            <li key={i} className="text-sm" style={{ color: "var(--dim)" }}>
              · {role}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑥ 연결 */}
      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.connect_label}</p>
        <p className="text-sm leading-loose whitespace-pre-line">{t.connect}</p>
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-wrap gap-2">
            {t.connect_no.map((item, i) => (
              <span key={i} className="text-xs px-2.5 py-1 border line-through" style={{ borderColor: "var(--border)", color: "var(--border)" }}>
                {item}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {t.connect_yes.map((item, i) => (
              <span key={i} className="text-xs px-2.5 py-1 border" style={{ borderColor: "var(--fg)", color: "var(--fg)" }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑦ 마무리 */}
      <section className="px-6 py-14 space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>{t.closing_label}</p>
        <p
          className="text-lg font-bold leading-snug pl-3"
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
