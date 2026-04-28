"use client";

import type { Lang } from "@/lib/i18n";

interface Props {
  description: string;
  philosophy?: string | null;
  ownerMessage?: string | null;
  experienceGuide?: string | null;
  spacePoints?: string | null;
  lang: Lang;
}

export default function SpaceStory({ description, philosophy, ownerMessage, experienceGuide, spacePoints, lang }: Props) {
  const t = {
    why:    lang === "ko" ? "이 공간을 만든 이유가 뭔가요?" : lang === "ja" ? "なぜこの空間を作ったのですか？" : lang === "zh" ? "为什么创建这个空间？" : "Why did you create this space?",
    guide:  lang === "ko" ? "어떻게 경험하면 좋을까요?" : lang === "ja" ? "どう楽しめばいいですか？" : lang === "zh" ? "如何体验这个空间？" : "How should visitors experience this?",
    points: lang === "ko" ? "이 공간만의 포인트가 있다면?" : lang === "ja" ? "この空間ならではのポイントは？" : lang === "zh" ? "这个空间有什么独特之处？" : "What makes this space special?",
  };

  return (
    <div className="space-y-8">
      {/* 리드 문단 — description */}
      <p className="text-base leading-8 whitespace-pre-line">{description}</p>

      {/* 인터뷰 — philosophy */}
      {philosophy && (
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--dim)" }}
          >
            Q.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            {t.why}
          </p>
          <p className="text-sm leading-8 whitespace-pre-line">{philosophy}</p>
        </div>
      )}

      {/* 인용 — ownerMessage */}
      {ownerMessage && (
        <div
          className="py-5 px-5 space-y-1"
          style={{ borderLeft: "2px solid var(--fg)" }}
        >
          <p className="text-base leading-8">&ldquo;{ownerMessage}&rdquo;</p>
        </div>
      )}

      {/* 인터뷰 — experienceGuide */}
      {experienceGuide && (
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--dim)" }}
          >
            Q.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            {t.guide}
          </p>
          <p className="text-sm leading-8 whitespace-pre-line">{experienceGuide}</p>
        </div>
      )}

      {/* 인터뷰 — spacePoints */}
      {spacePoints && (
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--dim)" }}
          >
            Q.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            {t.points}
          </p>
          <p className="text-sm leading-8 whitespace-pre-line">{spacePoints}</p>
        </div>
      )}
    </div>
  );
}
