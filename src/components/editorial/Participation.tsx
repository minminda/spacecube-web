import { PARTICIPATION } from "@/content/site";

/** 참여 영역 — 공간 제안 / 이야기 제보 / 협업 문의. 1단계는 이메일(mailto)로 받는다. */
export default function Participation() {
  return (
    <section id="participate" className="scroll-mt-16" style={{ borderTop: "1px solid var(--ed-line)" }}>
      <div className="ed-container py-16 md:py-24">
        <div className="mb-10 md:mb-14 space-y-3">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>PARTICIPATE</p>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
            함께 기록할 이야기를 기다립니다
          </h2>
        </div>
        <div className="grid md:grid-cols-3" style={{ borderTop: "1px solid var(--ed-fg)" }}>
          {PARTICIPATION.map((item, i) => (
            <div
              key={item.key}
              className={`flex flex-col gap-4 py-8 md:py-10 ${i > 0 ? "md:pl-8" : ""} ${i < PARTICIPATION.length - 1 ? "md:pr-8" : ""}`}
              style={{ borderBottom: "1px solid var(--ed-line)" }}
            >
              <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{item.label}</p>
              <p className="text-lg md:text-xl font-bold leading-snug">{item.title}</p>
              <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--ed-dim)" }}>{item.description}</p>
              <a
                href={item.href}
                className="tap-target inline-flex items-center justify-between self-start min-w-[180px] gap-6 px-5 text-sm font-semibold border transition-colors hover:bg-[var(--ed-fg)] hover:text-white"
                style={{ borderColor: "var(--ed-fg)" }}
              >
                {item.cta}
                <span aria-hidden>→</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
