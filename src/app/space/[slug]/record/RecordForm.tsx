"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@prisma/client";
import { getTagLabels, ALL_TAGS } from "@/lib/tags";
import type { Lang } from "@/lib/i18n";
import TagChip from "@/components/TagChip";

const MAX_TAGS = 2;
const MAX_MEMO = 120;

interface Props {
  space: { id: string; name: string; slug: string };
  spaceTags: Tag[];
  existingTags: Tag[];
  existingMemo: string;
  lang: Lang;
}

export default function RecordForm({ space, spaceTags, existingTags, existingMemo, lang }: Props) {
  const ko = lang === "ko";
  const TAG_LABELS = getTagLabels(lang);
  const tagsToShow = spaceTags.length > 0 ? spaceTags : ALL_TAGS;
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<Tag[]>(existingTags);
  const [memo, setMemo] = useState(existingMemo);
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: Tag) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }

  function handleMemoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (value.length <= MAX_MEMO) setMemo(value);
  }

  async function handleSubmit() {
    if (selectedTags.length === 0) return;
    setLoading(true);
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId: space.id, tags: selectedTags, memo }),
    });
    if (res.ok) {
      router.push(`/space/${space.slug}/done?name=${encodeURIComponent(space.name)}&tags=${selectedTags.join(",")}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">SPACECUBE / RECORD</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <button onClick={() => router.back()} className="text-xs" style={{ color: "var(--dim)" }}>
          &lt; back
        </button>
        <p className="text-base">&gt; {space.name}</p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* 태그 선택 */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            // {ko ? "이 공간 어땠나요?" : "How was this space?"}
          </p>
          <p className="text-xs" style={{ color: selectedTags.length >= MAX_TAGS ? "var(--fg)" : "var(--dim)" }}>
            {selectedTags.length}/{MAX_TAGS}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tagsToShow.map((tag) => (
            <TagChip
              key={tag}
              label={TAG_LABELS[tag]}
              selected={selectedTags.includes(tag)}
              onClick={() => toggleTag(tag)}
              disabled={!selectedTags.includes(tag) && selectedTags.length >= MAX_TAGS}
            />
          ))}
        </div>
        {selectedTags.length >= MAX_TAGS && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; {ko
              ? `최대 ${MAX_TAGS}개까지 고를 수 있어.`
              : `You can select up to ${MAX_TAGS} tags.`}
          </p>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* 메모 */}
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          // {ko ? "기록을 남겨볼까요? (선택)" : "Want to leave a note? (optional)"}
        </p>
        <textarea
          value={memo}
          onChange={handleMemoChange}
          placeholder={ko
            ? "오늘 어떤 생각이 들었나요... 한 줄로 남겨도 좋아요."
            : "What did you feel today... even one line is enough."}
          rows={4}
          className="w-full text-sm p-3 resize-none outline-none border"
          style={{
            background: "var(--bg)",
            color: "var(--fg)",
            borderColor: memo.length > 80 ? "var(--fg)" : "var(--border)",
            transition: "border-color 0.2s",
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={selectedTags.length === 0 || loading}
        className="w-full text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-30"
        style={{ borderColor: "var(--fg)" }}
      >
        {loading
          ? (ko ? "// 저장 중..." : "// Saving...")
          : (ko ? "[[ 저장하기 ]]" : "[[ Save ]]")}
      </button>
    </main>
  );
}
