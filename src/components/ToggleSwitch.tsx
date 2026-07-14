"use client";

interface Props {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

/** 관리자 폼 곳곳에 반복 구현돼 있던 온오프 슬라이더를 하나로 통합한 공용 컴포넌트. */
export default function ToggleSwitch({ label, checked, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="w-10 h-5 border relative transition-colors flex-shrink-0"
        style={{ borderColor: "var(--border)", background: checked ? "var(--fg)" : "transparent" }}
      >
        <span
          className="absolute top-0.5 w-3.5 h-3.5 transition-all"
          style={{ left: checked ? "calc(100% - 1rem)" : "0.1rem", background: checked ? "var(--bg)" : "var(--dim)" }}
        />
      </button>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{label}</p>
    </div>
  );
}
