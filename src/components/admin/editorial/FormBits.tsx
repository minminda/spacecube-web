"use client";

/* ── Editorial CMS 폼 공통 입력 ── */

export function FormSection({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="a-card p-5 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="text-xs leading-relaxed" style={{ color: "var(--a-dim)" }}>{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function TextInput({ value, onChange, placeholder, mono, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; type?: "text" | "number" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`a-input ${mono ? "font-mono text-[13px]" : ""}`}
    />
  );
}

export function TextArea({ value, onChange, rows = 4, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="a-input"
      style={{ height: "auto", padding: "10px 12px", lineHeight: 1.7, resize: "vertical" }}
    />
  );
}
