import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공간큐브 소개",
  description: "검색해도 나오지 않는 사람의 이야기를 통해 공간을 다르게 보게 만드는 서비스입니다.",
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
        <p className="text-xl font-bold leading-snug whitespace-pre-line">
          공간을 만든 사람을 이해하면,{"\n"}같은 공간도 조금 다르게 보입니다
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          공간큐브는 검색으로는 알기 어려운 공간과 사람의 이야기를 발견하게 하는 서비스입니다.
          메뉴, 영업시간, 평점보다 그 공간이 어떤 시간을 지나 지금의 모습이 되었는지를 기록합니다
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>왜 공간큐브를 만들었나요?</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
          우리는 많은 공간을 검색하지만, 그 공간을 만든 사람의 시간까지는 알기 어렵습니다{"\n"}
          멋진 결과만 보면 공간은 감탄의 대상이 되지만, 그 뒤의 선택과 실패, 반복된 시간을 알게 되면{"\n"}
          공간은 한 사람의 이야기로 기억됩니다
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>무엇을 담나요?</p>
        <ul className="space-y-2">
          {[
            "처음 이 일을 좋아하게 된 순간",
            "작게 시작했던 시절",
            "포기하지 못했던 선택",
            "매일 지키는 작은 습관",
            "아직 버리지 못한 물건",
            "오래 기억하는 손님",
            "그 시간이 현재 공간에 남은 방식",
          ].map((s, i) => (
            <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>· {s}</li>
          ))}
        </ul>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>어떻게 경험하나요?</p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
          공간에 놓인 큐브를 발견하고 QR을 인식하면, 그 장소에서만 만날 수 있는 이야기가 열립니다{"\n"}
          이야기를 읽고 나면 사용자는 사진 속 공간이 아니라 지금 눈앞의 자리와 물건, 사람을 다시 바라보게 됩니다
        </p>
        <ol className="space-y-0 pt-2">
          {["큐브 발견", "QR 인식", "공간을 만든 사람의 이야기", "공간을 다시 바라보기", "취향 점수 저장", "다음 공간 발견"].map((step, i, arr) => (
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
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브가 하지 않는 것</p>
        <ul className="space-y-1.5">
          {[
            "검색 가능한 정보를 반복하지 않습니다",
            "운영자를 완벽한 사람처럼 포장하지 않습니다",
            "억지 감동이나 성공담을 만들지 않습니다",
            "별점과 인기순으로 공간의 가치를 정하지 않습니다",
          ].map((item, i) => (
            <li key={i} className="text-sm leading-relaxed pl-3" style={{ color: "var(--dim)", borderLeft: "1px solid var(--border)" }}>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="px-6 py-14 space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브는</p>
        <p className="text-lg font-bold leading-snug pl-3" style={{ borderLeft: "2px solid var(--fg)" }}>
          공간을 완벽하게 설명하는 서비스가 아니라,{"\n"}그 공간을 조금 더 인간적으로 기억하게 만드는 서비스입니다
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="px-6 py-10">
        <Link
          href="/discover"
          className="tap-target flex items-center justify-center w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          공간 둘러보기 →
        </Link>
      </div>
    </main>
  );
}
