"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "@/lib/tags";
import TagChip from "@/components/TagChip";

const MAX_TAGS = 2;
const MAX_MEMO = 120;

interface Props {
  space: { id: string; name: string; slug: string };
  existingTags: Tag[];
  existingMemo: string;
}

export default function RecordForm({ space, existingTags, existingMemo }: Props) {
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
          <p className="text-xs" style={{ color: "var(--dim)" }}>// 이 공간 어땠나요?</p>
          <p className="text-xs" style={{ color: selectedTags.length >= MAX_TAGS ? "var(--fg)" : "var(--dim)" }}>
            {selectedTags.length}/{MAX_TAGS}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
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
            &gt; 최대 {MAX_TAGS}개까지 고를 수 있어.
          </p>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* 메모 */}
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>// 기록을 남겨볼까요? (선택)</p>
        <textarea
          value={memo}
          onChange={handleMemoChange}
          placeholder="오늘 어떤 생각이 들었나요... 한 줄로 남겨도 좋아요."
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
        {loading ? "// 저장 중..." : "[[ 저장하기 ]]"}
      </button>
    </main>
  );
}
