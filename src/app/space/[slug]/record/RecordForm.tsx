"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "@/lib/tags";
import TagChip from "@/components/TagChip";

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
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
        <p className="text-xs" style={{ color: "var(--dim)" }}>// 지금 이 공간에서 느끼는 감정을 골라봐.</p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <div className="flex flex-wrap gap-2">
        {ALL_TAGS.map((tag) => (
          <TagChip
            key={tag}
            label={TAG_LABELS[tag]}
            selected={selectedTags.includes(tag)}
            onClick={() => toggleTag(tag)}
          />
        ))}
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 한 줄 메모 (선택)</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value.slice(0, 100))}
          placeholder="오늘 여기서 무언가를 느꼈다면..."
          rows={3}
          className="w-full text-sm p-3 resize-none outline-none border"
          style={{
            background: "var(--bg)",
            color: "var(--fg)",
            borderColor: "var(--border)",
          }}
        />
        <p className="text-right text-xs" style={{ color: "var(--dim)" }}>{memo.length}/100</p>
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
