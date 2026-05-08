import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "어떻게 연결되나요 — 공간큐브",
  description: "공간큐브가 공간을 연결하는 방식",
};

const FLOW_STEPS = [
  {
    step: "방문",
    desc: "당신이 어떤 공간을 선택했는지,\n얼마나 오래 머물렀는지.",
  },
  {
    step: "기록",
    desc: "그 공간에서 남긴 감정과 짧은 인상.\n설명이 아니라 느낌의 흔적.",
  },
  {
    step: "취향 흐름",
    desc: "다시 방문한 공간, 저장해둔 이야기,\n반복되는 결들이 취향을 만듭니다.",
  },
  {
    step: "다음 공간 연결",
    desc: "비슷한 결의 공간들이\n천천히 당신 앞에 나타납니다.",
  },
];

const SIGNALS = [
  { label: "오래 머문 공간", desc: "시간은 선호의 언어입니다." },
  { label: "남긴 감정", desc: "리뷰가 아니라 느낌의 흔적." },
  { label: "재방문", desc: "다시 찾는다는 건 가장 솔직한 평가입니다." },
  { label: "저장한 이야기", desc: "읽고 싶었던 것, 기억하고 싶었던 것." },
];

export default function ConnectPage() {
  return (
    <main className="flex flex-col min-h-screen">

      {/* ① Hero — 시적 인트로 */}
      <section className="px-6 pt-16 pb-14 space-y-8">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>
          공간이 연결되는 방식
        </p>

        <p className="text-xl font-bold leading-loose whitespace-pre-line">
          {"당신이 오래 머물렀던 공간,\n남긴 감정,\n다시 방문한 장소들은 조용히 기록됩니다."}
        </p>

        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
          {"공간큐브는 이 흐름을 바탕으로\n비슷한 결의 공간들을 천천히 연결합니다."}
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ② 흐름 시각화 */}
      <section className="px-6 py-14 space-y-2">
        <p className="text-xs uppercase tracking-widest mb-10" style={{ color: "var(--border)" }}>
          흐름
        </p>

        {FLOW_STEPS.map((item, i) => (
          <div key={i}>
            <div className="flex items-start gap-6 py-6">
              {/* 스텝 번호 + 연결선 */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: "2rem" }}>
                <span
                  className="text-xs w-7 h-7 flex items-center justify-center border"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {i + 1}
                </span>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="w-px mt-2" style={{ background: "var(--border)", height: "3rem" }} />
                )}
              </div>

              {/* 텍스트 */}
              <div className="space-y-2 pt-0.5">
                <p className="text-base font-semibold">{item.step}</p>
                <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
                  {item.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ③ 어떤 흔적이 쌓이는가 */}
      <section className="px-6 py-14 space-y-8">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>
          조용히 쌓이는 것들
        </p>
        <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
          공간큐브는 당신에게 취향을 고르라고 하지 않습니다.<br />
          다만 당신이 머물고, 기록하고, 다시 찾는 순간들을 바라봅니다.
        </p>

        <div className="space-y-0">
          {SIGNALS.map((sig, i) => (
            <div
              key={i}
              className="flex items-start gap-5 py-5"
              style={{ borderBottom: i < SIGNALS.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span
                className="text-xs px-2 py-0.5 border flex-shrink-0 mt-0.5"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {sig.label}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                {sig.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ④ 마무리 */}
      <section className="px-6 py-14 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>
          공간큐브의 방식
        </p>
        <p
          className="text-base leading-loose pl-4"
          style={{ borderLeft: "2px solid var(--fg)" }}
        >
          검색이 아니라 흐름.<br />
          추천이 아니라 연결.<br />
          정보가 아니라 취향.
        </p>
        <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "var(--dim)" }}>
          {"공간큐브는 당신이 아직 모르는 공간을\n당신의 취향이 먼저 알고 있다고 믿습니다."}
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* CTA */}
      <div className="px-6 py-10 flex flex-col gap-3">
        <Link
          href="/discover"
          className="block w-full text-center text-sm py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          공간 탐험하기 →
        </Link>
        <Link
          href="/about"
          className="block w-full text-center text-xs py-2.5 transition-opacity hover:opacity-60"
          style={{ color: "var(--dim)" }}
        >
          공간큐브는 어떤 서비스인가요
        </Link>
      </div>
    </main>
  );
}
