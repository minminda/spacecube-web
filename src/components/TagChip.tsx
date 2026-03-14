"use client";

interface TagChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function TagChip({ label, selected, onClick }: TagChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm border transition-colors"
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
