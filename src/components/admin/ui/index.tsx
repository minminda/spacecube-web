import Link from "next/link";
import type { AdminArea } from "@/lib/adminNav";

/* ── 관리자 공통 UI 프리미티브(서버/클라이언트 공용, 상태 없음) ─────────────
   페이지 제목 · 섹션 · 표 · 상태 배지 · 빈 상태 · 지표 · 버튼 · 폼 필드.
   관리자(/admin)와 운영자(/operator)가 같은 컴포넌트를 공유한다. ── */

const AREA_LABEL: Record<AdminArea, string> = {
  overview: "Overview",
  content: "Content · 온라인",
  cube: "Cube Operation · 현장",
  system: "System",
};

export function AreaTag({ area }: { area: AdminArea }) {
  const cube = area === "cube";
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded text-[10px] font-semibold tracking-[0.1em] uppercase"
      style={{
        background: cube ? "var(--a-fg)" : "transparent",
        color: cube ? "#fff" : "var(--a-dim)",
        border: cube ? "1px solid var(--a-fg)" : "1px solid var(--a-line)",
      }}
    >
      {AREA_LABEL[area]}
    </span>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  area?: AdminArea;
  /** 제목 위 경로(예: 운영 공간 / 북눅 연남) */
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function AdminPageHeader({ title, description, area, breadcrumb, actions }: PageHeaderProps) {
  return (
    <header className="no-print flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-6 mb-8" style={{ borderBottom: "1px solid var(--a-line)" }}>
      <div className="space-y-2 min-w-0">
        {(area || breadcrumb) && (
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--a-dim)" }}>
            {area && <AreaTag area={area} />}
            {breadcrumb?.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {(i > 0 || area) && <span style={{ color: "var(--a-faint)" }}>/</span>}
                {b.href ? <Link href={b.href} className="hover:underline underline-offset-4">{b.label}</Link> : <span>{b.label}</span>}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-[22px] md:text-[26px] font-bold tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-sm leading-relaxed max-w-2xl" style={{ color: "var(--a-dim)" }}>{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function AdminSection({ title, description, actions, children, className }: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className ?? ""}`}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="text-xs leading-relaxed" style={{ color: "var(--a-dim)" }}>{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export type StatusTone = "live" | "off" | "draft" | "static" | "neutral" | "warn";

const TONE: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
  live: { bg: "#eef7f1", fg: "#1f6b43", dot: "#2f9e5f" },
  off: { bg: "#f3f3f3", fg: "#6b6b6b", dot: "#b5b5b5" },
  draft: { bg: "#fff6e6", fg: "#8a5a00", dot: "#e0a030" },
  static: { bg: "#f1f3f8", fg: "#3d4a66", dot: "#7b8bb0" },
  neutral: { bg: "#f3f3f3", fg: "#333", dot: "#888" },
  warn: { bg: "#fdf0ef", fg: "#a1271b", dot: "#d9493b" },
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-medium whitespace-nowrap" style={{ background: t.bg, color: t.fg }}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
      {children}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="a-card px-6 py-12 text-center space-y-2" style={{ borderStyle: "dashed" }}>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: "var(--a-dim)" }}>{description}</p>}
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}

/** 아직 없는 기능 — 저장되는 것처럼 보이는 버튼을 두지 않고, 준비 중임을 명확히 표시한다. */
export function NotReady({ title = "콘텐츠 관리 기능 준비 중", description }: { title?: string; description?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-md text-xs leading-relaxed" style={{ background: "var(--a-soft)", color: "var(--a-dim)", border: "1px solid var(--a-line)" }}>
      <span className="a-eyebrow shrink-0 pt-px" style={{ fontSize: 10 }}>Soon</span>
      <div className="space-y-0.5">
        <p className="font-semibold" style={{ color: "var(--a-fg)" }}>{title}</p>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

export function AdminStat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-xs" style={{ color: "var(--a-dim)" }}>{label}</p>
      <p className="text-[28px] font-bold tracking-tight leading-none tabular-nums">{value}</p>
      {hint && <p className="text-[11px] leading-snug" style={{ color: "var(--a-faint)" }}>{hint}</p>}
    </>
  );
  const cls = "a-card p-4 flex flex-col gap-2.5 min-h-[104px]";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-[#cfcfcf]`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function AdminTable({ head, children, minWidth = 640 }: { head: React.ReactNode[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="a-card overflow-x-auto">
      <table className="a-table" style={{ minWidth }}>
        <thead>
          <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function adminButtonClass(variant: BtnVariant = "secondary", size: "md" | "sm" = "md"): string {
  return ["a-btn", variant !== "secondary" ? `a-btn-${variant}` : "", size === "sm" ? "a-btn-sm" : ""].filter(Boolean).join(" ");
}

export function AdminButtonLink({ href, variant, size, children, external }: {
  href: string; variant?: BtnVariant; size?: "md" | "sm"; children: React.ReactNode; external?: boolean;
}) {
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={adminButtonClass(variant, size)}>{children}</a>;
  }
  return <Link href={href} className={adminButtonClass(variant, size)}>{children}</Link>;
}

/** 필터 바 — 서버 페이지용 GET 폼(자바스크립트 없이 ?q= 로 검색). */
export function FilterBar({ q, placeholder = "검색", children }: { q?: string; placeholder?: string; children?: React.ReactNode }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2 mb-4">
      <input type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder ?? "검색"} className="a-input max-w-xs" />
      {children}
      <button type="submit" className={adminButtonClass("secondary")}>검색</button>
    </form>
  );
}

export function AdminFormField({ label, required, optional, help, children }: {
  label: string; required?: boolean; optional?: boolean; help?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[13px] font-medium">
        {label}
        {required && <span style={{ color: "var(--a-danger)" }} aria-label="필수">*</span>}
        {optional && <span className="text-[11px] font-normal" style={{ color: "var(--a-faint)" }}>선택</span>}
      </label>
      {children}
      {help && <p className="text-[11px] leading-relaxed" style={{ color: "var(--a-dim)" }}>{help}</p>}
    </div>
  );
}

export function formatAdminDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date)
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
}
