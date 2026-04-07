"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";

interface Props {
  description: string;
  philosophy?: string | null;
  ownerMessage?: string | null;
  experienceGuide?: string | null;
  spacePoints?: string | null;
  lang: Lang;
}

function CollapsibleSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between py-1"
        style={{ color: "var(--dim)" }}>
        <span className="text-xs">// {label}</span>
        <span className="text-xs" style={{ color: "var(--dim)" }}>{open ? "[ − ]" : "[ + ]"}</span>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

export default function SpaceStory({ description, philosophy, ownerMessage, experienceGuide, spacePoints, lang }: Props) {
  const t = {
    about:    lang === "ko" ? "공간 해석"   : lang === "ja" ? "この空間について" : "About This Space",
    why:      lang === "ko" ? "왜 만들었나" : lang === "ja" ? "なぜ作ったのか"  : "Why it was created",
    owner:    lang === "ko" ? "운영자의 말" : lang === "ja" ? "オーナーのメッセージ" : "Owner's message",
    guide:    lang === "ko" ? "경험 가이드" : lang === "ja" ? "体験ガイド"      : "Experience Guide",
    points:   lang === "ko" ? "공간 포인트" : lang === "ja" ? "空間のハイライト" : "Space Highlights",
  };

  return (
    <>
      <CollapsibleSection label={t.about}>
        <p className="text-sm leading-relaxed whitespace-pre-line">{description}</p>
        {philosophy && (
          <div className="space-y-1">
            <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; {t.why}</p>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>{philosophy}</p>
          </div>
        )}
        {ownerMessage && (
          <div className="space-y-1">
            <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; {t.owner}</p>
            <p className="text-sm" style={{ color: "var(--fg)" }}>&ldquo;{ownerMessage}&rdquo;</p>
          </div>
        )}
      </CollapsibleSection>

      {experienceGuide && (
        <>
          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
          <CollapsibleSection label={t.guide}>
            <p className="text-sm leading-relaxed whitespace-pre-line">{experienceGuide}</p>
          </CollapsibleSection>
        </>
      )}

      {spacePoints && (
        <>
          <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
          <CollapsibleSection label={t.points}>
            <p className="text-sm leading-relaxed whitespace-pre-line">{spacePoints}</p>
          </CollapsibleSection>
        </>
      )}
    </>
  );
}
