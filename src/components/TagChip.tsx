"use client";

interface TagChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function TagChip({ label, selected, onClick, disabled }: TagChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 text-sm border transition-colors disabled:opacity-30"
      style={
        selected
          ? { borderColor: "var(--fg)", background: "var(--fg)", color: "var(--bg)" }
          : { borderColor: "var(--border)", color: "var(--dim)" }
      }
    >
      {selected ? `[${label}]` : label}
    </button>
  );
}
