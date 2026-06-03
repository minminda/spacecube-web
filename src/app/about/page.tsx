import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공간큐브 소개",
  description: "공간 경험을 기록하고, 그 기록을 통해 자신의 취향을 발견하는 서비스입니다.",
};

export default function AboutPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-6 pt-10 pb-6">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <span className="text-xs" style={{ color: "var(--border)" }}>ABOUT</span>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-14 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브는</p>
        <p className="text-xl font-bold leading-snug whitespace-pre-line">
          공간 경험을 기록하고,{"\n"}그 기록을 통해 자신의 취향을 발견하는 서비스입니다.
        </p>
        <ul className="space-y-2 pt-2">
          {[
            "작은 문화공간의 이야기와 철학을 발견합니다.",
            "공간을 단순 정보가 아닌 경험으로 기록합니다.",
            "취향이 비슷한 공간들을 천천히 연결합니다.",
          ].map((s, i) => (
            <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>· {s}</li>
          ))}
        </ul>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>왜 공간큐브를 만들었는가</p>
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>현재 공간 플랫폼은</p>
          <ul className="space-y-1.5">
            {[
              "리뷰, 평점, 인기순, 빠른 소비 중심으로 움직입니다.",
              "이미 유명한 공간만 반복 노출됩니다.",
              "공간의 철학은 전달되지 않습니다.",
              "사용자는 공간보다 정보만 소비하게 됩니다.",
            ].map((item, i) => (
              <li key={i} className="text-sm leading-relaxed pl-3" style={{ color: "var(--dim)", borderLeft: "1px solid var(--border)" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm leading-loose whitespace-pre-line">
          사람들은 많은 공간을 경험하지만,{"\n"}시간이 지나면 그 공간과 자신의 취향을 잊어버립니다.{"\n\n"}우리는 공간을 검색하고 소비하지만,{"\n"}왜 그 공간이 좋았는지는 남기지 못합니다.
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브가 기록하는 공간</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
          공간큐브는 운영자의 취향과 철학이 담긴 작은 문화공간들을 기록합니다.{"\n"}단순히 유명한 공간보다, 공간만의 결이 느껴지는 곳을 중요하게 생각합니다.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {["독립서점", "작은 전시공간", "LP바", "조용한 카페", "소품샵", "복합문화공간"].map((ex, i) => (
            <span key={i} className="text-xs px-2.5 py-1 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              {ex}
            </span>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>경험의 흐름</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
          공간큐브는 기록을 강요하지 않습니다.{"\n"}사람은 기록하기 위해 공간에 가는 것이 아니라,{"\n"}공간을 경험하기 위해 방문합니다.{"\n"}기록은 경험 이후 자연스럽게 남습니다.
        </p>
        <ol className="space-y-0 pt-2">
          {["공간 발견", "큐브 발견", "QR 스캔", "공간 이야기", "짧은 기록", "취향 축적", "다음 공간 탐험"].map((step, i, arr) => (
            <li key={i} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <span className="w-5 h-5 flex-shrink-0 border flex items-center justify-center text-xs" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                  {i + 1}
                </span>
                {i < arr.length - 1 && <div className="w-px flex-1 my-1" style={{ background: "var(--border)", minHeight: "1.5rem" }} />}
              </div>
              <p className={`text-sm pt-0.5 pb-4 ${i === arr.length - 1 ? "font-semibold" : ""}`} style={{ color: i === arr.length - 1 ? "var(--fg)" : "var(--dim)" }}>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브 오브젝트</p>
        <p className="text-sm leading-loose whitespace-pre-line">
          공간큐브는 단순한 QR 코드가 아닙니다.{"\n"}각 공간에 하나씩 놓이는 작은 오브젝트이며,{"\n"}그 공간의 이야기로 들어가는 입구 역할을 합니다.
        </p>
        <ul className="space-y-1.5 pt-1">
          {["공간의 중심", "발견의 신호", "탐험의 시작점"].map((role, i) => (
            <li key={i} className="text-sm" style={{ color: "var(--dim)" }}>· {role}</li>
          ))}
        </ul>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브가 지향하는 연결</p>
        <p className="text-sm leading-loose whitespace-pre-line">
          공간큐브는 사람을 팔로우하는 서비스가 아닙니다.{"\n"}공간을 통해 취향을 발견하고,{"\n"}그 취향을 따라 다른 공간으로 이어지는 경험을 만듭니다.
        </p>
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-wrap gap-2">
            {["리뷰 경쟁", "별점", "인기순"].map((item, i) => (
              <span key={i} className="text-xs px-2.5 py-1 border line-through" style={{ borderColor: "var(--border)", color: "var(--border)" }}>{item}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {["기록", "감정", "탐험", "취향"].map((item, i) => (
              <span key={i} className="text-xs px-2.5 py-1 border" style={{ borderColor: "var(--fg)", color: "var(--fg)" }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-14 space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브는</p>
        <p className="text-lg font-bold leading-snug pl-3" style={{ borderLeft: "2px solid var(--fg)" }}>
          취향은 설명보다 경험 속에서 드러난다고 믿습니다.
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="px-6 py-10">
        <Link
          href="/discover"
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          공간 둘러보기 →
        </Link>
      </div>
    </main>
  );
}
