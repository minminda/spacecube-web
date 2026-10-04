interface Props {
  label: string;
  title: string;
  description?: string;
  /** 제목 아래 바로 붙는 행동(버튼 · 선택기 등) */
  children?: React.ReactNode;
  /** 제목 오른쪽 위 작은 도구(알림 · 설정 등) */
  tools?: React.ReactNode;
}

/**
 * 사용자 화면 공용 헤더 — 추천 · 내 아카이브 · STORY · CURATION · LATEST · 사람 찾기가 같은 크기와 여백을 쓴다.
 * 라벨 · 제목(휴대폰 36px / 데스크톱 56px) · (선택) 한 줄 설명 · (선택) 행동. 구분선은 아래 탭 줄이 맡는다.
 */
export default function PageHeader({ label, title, description, children, tools }: Props) {
  return (
    <header className="ed-container pt-8 pb-6 md:pt-14 md:pb-8">
      <div className="flex items-start justify-between gap-4">
        <p className="ed-label pt-1" style={{ color: "var(--ed-dim)" }}>{label}</p>
        {tools && <div className="flex items-center gap-4 -mt-1">{tools}</div>}
      </div>
      <h1 className="pt-2 text-[36px] md:text-[56px] font-bold leading-none tracking-[-0.04em] break-keep">{title}</h1>
      {description && (
        <p className="pt-3 max-w-[560px] text-sm md:text-base leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>{description}</p>
      )}
      {children}
    </header>
  );
}
