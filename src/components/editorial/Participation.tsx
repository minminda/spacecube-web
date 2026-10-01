import { PARTICIPATION } from "@/content/site";

/** 참여 영역 — 짧은 CTA 한 줄. 공간 제안(mailto)만 전면에 두고, 제보·협업은 푸터 문의로 받는다. */
export default function Participation() {
  const item = PARTICIPATION[0];
  return (
    <section id="participate" className="scroll-mt-16" style={{ borderTop: "1px solid var(--ed-line)" }}>
      <div className="ed-container py-8 md:py-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>PARTICIPATE</p>
          <p className="text-lg md:text-2xl font-bold tracking-tight leading-snug break-keep">
            공간의 이야기를 함께 기록하고 싶다면.
          </p>
        </div>
        <a
          href={item.href}
          className="tap-target inline-flex items-center justify-between gap-6 px-5 text-sm font-semibold border transition-colors hover:bg-[var(--ed-fg)] hover:text-white md:min-w-[200px]"
          style={{ borderColor: "var(--ed-fg)" }}
        >
          {item.cta}
          <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
