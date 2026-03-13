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
      className={`
        px-4 py-2 rounded-full text-sm transition-all
        ${selected
          ? "bg-[var(--fg)] text-[var(--bg)]"
          : "bg-[var(--tag-bg)] text-[var(--fg)] hover:bg-[var(--border)]"
        }
      `}
    >
      {label}
    </button>
  );
}
