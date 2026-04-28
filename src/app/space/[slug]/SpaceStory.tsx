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
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between py-3"
        style={{ borderBottom: open ? "none" : "1px solid var(--border)" }}
      >
        <span className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{label}</span>
        <span className="text-base font-light" style={{ color: "var(--dim)" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="pt-4 pb-3 space-y-4" style={{ borderBottom: "1px solid var(--border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function SpaceStory({ description, philosophy, ownerMessage, experienceGuide, spacePoints, lang }: Props) {
  const t = {
    about:  lang === "ko" ? "공간 해석"   : lang === "ja" ? "この空間について" : lang === "zh" ? "关于这个空间" : "About This Space",
    why:    lang === "ko" ? "왜 만들었나" : lang === "ja" ? "なぜ作ったのか"  : lang === "zh" ? "创建原因"    : "Why it was created",
    owner:  lang === "ko" ? "운영자의 말" : lang === "ja" ? "オーナーのメッセージ" : lang === "zh" ? "运营者的话" : "Owner's message",
    guide:  lang === "ko" ? "경험 가이드" : lang === "ja" ? "体験ガイド"      : lang === "zh" ? "体验指南"    : "Experience Guide",
    points: lang === "ko" ? "공간 포인트" : lang === "ja" ? "空間のハイライト" : lang === "zh" ? "空间亮点"    : "Space Highlights",
  };

  return (
    <div className="space-y-0">
      <CollapsibleSection label={t.about}>
        <p className="text-sm leading-relaxed whitespace-pre-line">{description}</p>
        {philosophy && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.why}</p>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>{philosophy}</p>
          </div>
        )}
        {ownerMessage && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.owner}</p>
            <p className="text-sm leading-relaxed">&ldquo;{ownerMessage}&rdquo;</p>
          </div>
        )}
      </CollapsibleSection>

      {experienceGuide && (
        <CollapsibleSection label={t.guide}>
          <p className="text-sm leading-relaxed whitespace-pre-line">{experienceGuide}</p>
        </CollapsibleSection>
      )}

      {spacePoints && (
        <CollapsibleSection label={t.points}>
          <p className="text-sm leading-relaxed whitespace-pre-line">{spacePoints}</p>
        </CollapsibleSection>
      )}
    </div>
  );
}
