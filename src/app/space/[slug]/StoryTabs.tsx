"use client";

import { useState } from "react";
import SpaceStory, { type StoryItem } from "./SpaceStory";
import OwnerStory from "./OwnerStory";
import type { Lang } from "@/lib/i18n";

interface Props {
  // 공간 이야기
  description: string;
  philosophy?: string | null;
  ownerMessage?: string | null;
  experienceGuide?: string | null;
  spacePoints?: string | null;
  storyItems?: StoryItem[] | null;
  // 운영자 이야기
  ownerName?: string | null;
  ownerPhotoUrl?: string | null;
  ownerBio?: string | null;
  ownerValues?: string | null;
  ownerPlaylistUrl?: string | null;
  ownerBlogUrl?: string | null;
  ownerSocialUrl?: string | null;
  lang: Lang;
}

export default function StoryTabs({
  description, philosophy, ownerMessage, experienceGuide, spacePoints, storyItems,
  ownerName, ownerPhotoUrl, ownerBio, ownerValues, ownerPlaylistUrl, ownerBlogUrl, ownerSocialUrl,
  lang,
}: Props) {
  const [tab, setTab] = useState<"space" | "owner">("space");

  const tabSpace  = lang === "ko" ? "공간의 이야기" : lang === "ja" ? "空間の話" : lang === "zh" ? "空间的故事" : "Space Story";
  const tabOwner  = lang === "ko" ? "운영자의 이야기" : lang === "ja" ? "オーナーの話" : lang === "zh" ? "老板的故事" : "Owner's Story";

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="flex gap-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => setTab("space")}
          className="pb-3 text-xs uppercase tracking-widest transition-colors"
          style={{
            color: tab === "space" ? "var(--fg)" : "var(--dim)",
            borderBottom: tab === "space" ? "1px solid var(--fg)" : "1px solid transparent",
            marginBottom: "-1px",
          }}
        >
          {tabSpace}
        </button>
        <button
          onClick={() => setTab("owner")}
          className="pb-3 text-xs uppercase tracking-widest transition-colors"
          style={{
            color: tab === "owner" ? "var(--fg)" : "var(--dim)",
            borderBottom: tab === "owner" ? "1px solid var(--fg)" : "1px solid transparent",
            marginBottom: "-1px",
          }}
        >
          {tabOwner}
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {tab === "space" ? (
        <SpaceStory
          description={description}
          philosophy={philosophy}
          ownerMessage={ownerMessage}
          experienceGuide={experienceGuide}
          spacePoints={spacePoints}
          storyItems={storyItems}
          lang={lang}
        />
      ) : (
        <OwnerStory
          ownerName={ownerName}
          ownerPhotoUrl={ownerPhotoUrl}
          ownerBio={ownerBio}
          ownerValues={ownerValues}
          ownerPlaylistUrl={ownerPlaylistUrl}
          ownerBlogUrl={ownerBlogUrl}
          ownerSocialUrl={ownerSocialUrl}
          lang={lang}
        />
      )}
    </div>
  );
}
