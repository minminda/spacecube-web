import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "어떻게 연결되나요 — 공간큐브",
  description: "공간큐브가 사용자 경험 데이터를 기반으로 공간을 연결하는 구조",
};

const TAGS = [
  { key: "QUIET",       label: "조용한" },
  { key: "INSPIRING",   label: "영감 있는" },
  { key: "COMFORTABLE", label: "편안한" },
  { key: "UNIQUE",      label: "독특한" },
  { key: "WANT_AGAIN",  label: "다시 오고 싶은" },
  { key: "SENSIBLE",    label: "감각 있는" },
  { key: "WARM",        label: "따뜻한" },
  { key: "FOCUSED",     label: "집중되는" },
];

const SIGNALS = [
  {
    signal: "공간 방문",
    type: "행동",
    weight: "기준점",
    desc: "QR 스캔으로 어떤 공간을 선택했는지 기록됩니다.",
  },
  {
    signal: "감정 태그 선택",
    type: "명시적 데이터",
    weight: "높음",
    desc: "기록 시 선택한 태그가 취향 프로필을 직접 구성합니다. 태그 빈도가 곧 취향의 가중치입니다.",
  },
  {
    signal: "재방문",
    type: "행동",
    weight: "높음",
    desc: "같은 공간에 다시 찾는 행위는 강한 선호 신호입니다. 중복 방문은 해당 공간의 태그 가중치를 높입니다.",
  },
  {
    signal: "이야기 저장",
    type: "행동",
    weight: "보조",
    desc: "지역 이야기·취향 이야기를 저장한 패턴이 공간 유형 선호를 보완합니다.",
  },
];

const MODES = [
  {
    mode: "similar",
    label: "취향 일치",
    summary: "기록된 태그와 가장 많이 겹치는 공간을 연결합니다.",
    sub: "당신이 자주 선택한 태그를 공유하는 공간을 우선합니다.",
  },
  {
    mode: "diverse",
    label: "새로운 발견",
    summary: "취향 벡터와 의도적으로 다른 방향의 공간을 연결합니다.",
    sub: "익숙함 바깥의 공간으로 취향을 확장합니다.",
  },
];

export default function ConnectPage() {
  return (
    <main className="flex flex-col min-h-screen">

      {/* ① 서두 — 직접적이고 구조적 */}
      <section className="px-6 pt-16 pb-14 space-y-5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>
          경험 데이터 기반 공간 연결
        </p>
        <p className="text-xl font-bold leading-snug">
          당신이 공간에서 남긴 기록이<br />
          다음 공간을 결정합니다.
        </p>
        <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
          공간큐브는 "AI가 추천합니다"가 아닙니다.<br />
          사용자가 직접 선택하고 남긴 경험 데이터를 바탕으로<br />
          공간과 공간 사이의 연결을 계산합니다.
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ② 입력 신호 */}
      <section className="px-6 py-12 space-y-8">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>입력 신호</p>
          <p className="text-sm" style={{ color: "var(--dim)" }}>어떤 데이터가 취향을 만드는가</p>
        </div>

        <div className="space-y-0">
          {SIGNALS.map((s, i) => (
            <div
              key={i}
              className="py-5 space-y-2"
              style={{ borderBottom: i < SIGNALS.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">{s.signal}</span>
                <span
                  className="text-xs px-2 py-0.5 border"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {s.type}
                </span>
                <span
                  className="text-xs px-2 py-0.5"
                  style={{
                    background: s.weight === "높음" ? "var(--fg)" : "transparent",
                    color: s.weight === "높음" ? "var(--bg)" : "var(--border)",
                    border: s.weight === "높음" ? "none" : "1px solid var(--border)",
                  }}
                >
                  가중치 {s.weight}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ③ 감정 태그 시스템 */}
      <section className="px-6 py-12 space-y-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>감정 태그</p>
          <p className="text-sm" style={{ color: "var(--dim)" }}>취향 프로필을 구성하는 8개 차원</p>
        </div>

        <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
          공간 기록 시 선택하는 태그가 취향 벡터를 형성합니다.<br />
          누적된 태그 빈도가 곧 취향의 가중치입니다.
        </p>

        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <span
              key={tag.key}
              className="text-xs px-3 py-1.5 border"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            >
              {tag.label}
            </span>
          ))}
        </div>

        {/* 취향 벡터 시각화 — 예시 */}
        <div
          className="mt-4 p-4 space-y-3"
          style={{ background: "var(--tag-bg)", borderLeft: "2px solid var(--border)" }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>예시 — 취향 프로필</p>
          <div className="space-y-2">
            {[
              { tag: "조용한", pct: 75 },
              { tag: "영감 있는", pct: 60 },
              { tag: "감각 있는", pct: 40 },
              { tag: "편안한", pct: 25 },
            ].map(({ tag, pct }) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="text-xs w-24 flex-shrink-0" style={{ color: "var(--dim)" }}>{tag}</span>
                <div className="flex-1 h-px relative" style={{ background: "var(--border)" }}>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5"
                    style={{ width: `${pct}%`, background: "var(--fg)", left: 0 }}
                  />
                </div>
                <span className="text-xs w-8 text-right" style={{ color: "var(--border)" }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ④ 스코어링 구조 */}
      <section className="px-6 py-12 space-y-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간 스코어링</p>
          <p className="text-sm" style={{ color: "var(--dim)" }}>어떻게 공간의 우선순위를 계산하는가</p>
        </div>

        {/* 가중치 구조 */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div
                className="h-8 flex items-center px-3"
                style={{ background: "var(--fg)", color: "var(--bg)" }}
              >
                <span className="text-xs font-medium">태그 일치도</span>
              </div>
            </div>
            <span className="text-sm font-bold w-10 text-right">60%</span>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ flex: "0 0 60%" }}>
              <div
                className="h-8 flex items-center px-3"
                style={{ background: "var(--border)", color: "var(--fg)" }}
              >
                <span className="text-xs">위치 거리 (3km 반경)</span>
              </div>
            </div>
            <div style={{ flex: "0 0 40%" }} className="flex items-center gap-4">
              <div
                className="h-8 flex items-center px-3 flex-1"
                style={{ background: "var(--tag-bg)", border: "1px solid var(--border)", color: "var(--dim)" }}
              >
                <span className="text-xs">위치 거리 (3km 반경)</span>
              </div>
              <span className="text-sm font-bold w-10 text-right" style={{ color: "var(--dim)" }}>40%</span>
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          위치 정보가 없는 경우 태그 일치도 100%로 계산됩니다.<br />
          위치가 있으면 3km 이내 가까운 공간에 추가 가중치가 부여됩니다.
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑤ 두 가지 연결 모드 */}
      <section className="px-6 py-12 space-y-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>연결 모드</p>
          <p className="text-sm" style={{ color: "var(--dim)" }}>같은 취향을 확인할 것인가, 새로운 취향을 발견할 것인가</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MODES.map((m) => (
            <div
              key={m.mode}
              className="p-5 space-y-3"
              style={{ border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5"
                  style={{ background: "var(--tag-bg)", color: "var(--border)", fontFamily: "monospace" }}
                >
                  {m.mode}
                </span>
                <span className="text-sm font-medium">{m.label}</span>
              </div>
              <p className="text-sm leading-relaxed">{m.summary}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{m.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑥ 전체 파이프라인 요약 */}
      <section className="px-6 py-12 space-y-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>전체 흐름</p>

        <div className="space-y-0">
          {[
            { step: "QR 스캔", detail: "공간 방문 기록" },
            { step: "태그 선택", detail: "감정 데이터 입력" },
            { step: "취향 집계", detail: "태그 빈도 → 취향 벡터" },
            { step: "후보 공간 탐색", detail: "태그·위치 스코어 계산" },
            { step: "연결 모드 선택", detail: "similar / diverse" },
            { step: "공간 제시", detail: "상위 N개 공간 반환" },
          ].map((row, i, arr) => (
            <div key={i} className="flex items-stretch gap-4">
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: "1rem" }}>
                <div
                  className="w-2 h-2 rounded-full mt-4 flex-shrink-0"
                  style={{ background: "var(--fg)" }}
                />
                {i < arr.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: "var(--border)" }} />
                )}
              </div>
              <div className="pb-5 pt-3 flex items-baseline gap-3">
                <span className="text-sm font-medium">{row.step}</span>
                <span className="text-xs" style={{ color: "var(--dim)" }}>{row.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ⑦ 마무리 */}
      <section className="px-6 py-12 space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>설계 원칙</p>
        <p
          className="text-base leading-loose pl-4"
          style={{ borderLeft: "2px solid var(--fg)" }}
        >
          블랙박스 추천이 아닌,<br />
          사용자가 직접 쌓은 경험 데이터로 작동하는 연결.
        </p>
        <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
          공간큐브는 사용자가 선택하지 않은 데이터를 수집하지 않습니다.<br />
          기록하고, 태그를 고르고, 다시 찾는 행위 자체가 입력입니다.
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
