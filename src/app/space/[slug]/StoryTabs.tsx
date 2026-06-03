"use client";

import { useState } from "react";
import SpaceStory, { type StoryItem } from "./SpaceStory";
import OwnerStory from "./OwnerStory";

interface Props {
  description: string;
  philosophy?: string | null;
  ownerMessage?: string | null;
  experienceGuide?: string | null;
  spacePoints?: string | null;
  storyItems?: StoryItem[] | null;
  ownerName?: string | null;
  ownerPhotoUrl?: string | null;
  ownerBio?: string | null;
  ownerValues?: string | null;
  ownerPlaylistUrl?: string | null;
  ownerBlogUrl?: string | null;
  ownerSocialUrl?: string | null;
}

export default function StoryTabs({
  description, philosophy, ownerMessage, experienceGuide, spacePoints, storyItems,
  ownerName, ownerPhotoUrl, ownerBio, ownerValues, ownerPlaylistUrl, ownerBlogUrl, ownerSocialUrl,
}: Props) {
  const [tab, setTab] = useState<"space" | "owner">("space");

  return (
    <div className="space-y-6">
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
          공간의 이야기
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
          운영자의 이야기
        </button>
      </div>

      {tab === "space" ? (
        <SpaceStory
          description={description}
          philosophy={philosophy}
          ownerMessage={ownerMessage}
          experienceGuide={experienceGuide}
          spacePoints={spacePoints}
          storyItems={storyItems}
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
        />
      )}
    </div>
  );
}
