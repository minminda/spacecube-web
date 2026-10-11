/** 설정 구획 — 제목 + 한 줄 설명 + 내용. 관리자 화면 같은 표가 아니라 개인 설정 카드처럼(/settings 전용). */
export default function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="py-7 md:py-8" style={{ borderTop: "1px solid var(--ed-line)" }}>
      <h2 className="text-lg md:text-xl font-bold tracking-[-0.02em]">{title}</h2>
      {description && <p className="pt-1 text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>{description}</p>}
      <div className="pt-5">{children}</div>
    </section>
  );
}
