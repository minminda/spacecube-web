"use client";

import Image from "next/image";

export type StoryItem =
  | { type: "qa"; q: string; a: string }
  | { type: "image"; url: string };

interface Props {
  description: string;
  philosophy?: string | null;
  ownerMessage?: string | null;
  experienceGuide?: string | null;
  spacePoints?: string | null;
  storyItems?: StoryItem[] | null;
}

export default function SpaceStory({ description, philosophy, ownerMessage, experienceGuide, spacePoints, storyItems }: Props) {
  if (storyItems && storyItems.length > 0) {
    return (
      <div className="space-y-8">
        <p className="text-base leading-8 whitespace-pre-line">{description}</p>
        {storyItems.map((item, i) =>
          item.type === "qa" ? (
            <div key={i} className="space-y-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>Q.</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{item.q}</p>
              <p className="text-sm leading-8 whitespace-pre-line">{item.a}</p>
            </div>
          ) : (
            <div key={i} className="relative w-full overflow-hidden" style={{ aspectRatio: "16/10" }}>
              <Image src={item.url} alt="" fill className="object-cover" />
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-base leading-8 whitespace-pre-line">{description}</p>

      {philosophy && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>Q.</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>이 공간을 만든 이유가 뭔가요?</p>
          <p className="text-sm leading-8 whitespace-pre-line">{philosophy}</p>
        </div>
      )}

      {ownerMessage && (
        <div className="py-5 px-5 space-y-1" style={{ borderLeft: "2px solid var(--fg)" }}>
          <p className="text-base leading-8">&ldquo;{ownerMessage}&rdquo;</p>
        </div>
      )}

      {experienceGuide && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>Q.</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>어떻게 경험하면 좋을까요?</p>
          <p className="text-sm leading-8 whitespace-pre-line">{experienceGuide}</p>
        </div>
      )}

      {spacePoints && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>Q.</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>이 공간만의 포인트가 있다면?</p>
          <p className="text-sm leading-8 whitespace-pre-line">{spacePoints}</p>
        </div>
      )}
    </div>
  );
}
