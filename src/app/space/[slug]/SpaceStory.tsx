"use client";

import { useState } from "react";

interface Section {
  key: string;
  label: string;
  content: string | null | undefined;
  subItems?: { label: string; content: string }[];
}

interface Props {
  description: string;
  philosophy?: string | null;
  ownerMessage?: string | null;
  experienceGuide?: string | null;
  spacePoints?: string | null;
}

function CollapsibleSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between py-1"
        style={{ color: "var(--dim)" }}
      >
        <span className="text-xs">// {label}</span>
        <span className="text-xs" style={{ color: "var(--dim)" }}>{open ? "[ − ]" : "[ + ]"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function SpaceStory({ description, philosophy, ownerMessage, experienceGuide, spacePoints }: Props) {
  return (
    <>
      {/* 섹션 1: 공간 해석 */}
      <CollapsibleSection label="공간 해석">
        <p className="text-sm leading-relaxed whitespace-pre-line">{description}</p>
        {philosophy && (
          <div className="space-y-1">
            <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 왜 만들었나</p>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
              {philosophy}
            </p>
          </div>
        )}
        {ownerMessage && (
          <div className="space-y-1">
            <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 운영자의 말</p>
            <p className="text-sm" style={{ color: "var(--fg)" }}>
              &ldquo;{ownerMessage}&rdquo;
            </p>
          </div>
        )}
      </CollapsibleSection>

      {/* 섹션 2: 경험 가이드 */}
      {experienceGuide && (
        <>
          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
          <CollapsibleSection label="경험 가이드">
            <p className="text-sm leading-relaxed whitespace-pre-line">{experienceGuide}</p>
          </CollapsibleSection>
        </>
      )}

      {/* 섹션 3: 공간 포인트 */}
      {spacePoints && (
        <>
          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
          <CollapsibleSection label="공간 포인트">
            <p className="text-sm leading-relaxed whitespace-pre-line">{spacePoints}</p>
          </CollapsibleSection>
        </>
      )}
    </>
  );
}
