export default function OperatorHero() {
  return (
    <section className="px-6 pt-20 pb-16 space-y-8">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>운영자님께</p>
      <h1 className="text-3xl font-bold leading-snug whitespace-pre-line">
        {"당신의 공간에는\n분명 이야기가 있습니다."}
      </h1>
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
        {"하지만 대부분의 플랫폼은 그 이야기를 보여주지 않습니다.\n공간큐브는 공간의 철학을 방문자에게 전달하는 도구입니다."}
      </p>
      <a
        href="#contact"
        className="inline-block text-sm font-medium py-3 px-6 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
        style={{ borderColor: "var(--fg)" }}
      >
        이야기 들어보기 →
      </a>
    </section>
  );
}
