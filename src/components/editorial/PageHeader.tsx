interface Props {
  label: string;
  title: string;
  description?: string;
}

/** 에디토리얼 목록 페이지 공용 헤더 — 큰 제목 + 관점을 설명하는 한 문단. */
export default function PageHeader({ label, title, description }: Props) {
  return (
    <header className="ed-container pt-12 pb-10 md:pt-20 md:pb-16" style={{ borderBottom: "1px solid var(--ed-fg)" }}>
      <div className="grid gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7 space-y-4">
          <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{label}</p>
          <h1 className="text-[44px] md:text-[72px] font-bold leading-none tracking-[-0.04em]">{title}</h1>
        </div>
        {description && (
          <p className="md:col-span-5 text-base md:text-lg leading-relaxed" style={{ color: "var(--ed-dim)" }}>{description}</p>
        )}
      </div>
    </header>
  );
}
