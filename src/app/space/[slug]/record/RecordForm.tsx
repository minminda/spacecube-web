"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "@/lib/tags";
import TagChip from "@/components/TagChip";
import { ENABLE_RECORD_TAG_SELECTION } from "@/lib/features";

const MAX_TAGS = 2;
const MAX_MEMO = 120;

const SCORE_LABELS: Record<number, string> = {
  1: "전혀 맞지 않음",
  2: "조금 아쉬움",
  3: "보통",
  4: "잘 맞음",
  5: "매우 잘 맞음",
};

interface Props {
  space: { id: string; name: string; slug: string };
  spaceTags: Tag[];
  visitCount: number;
  previousRecord: { tags: Tag[]; memo: string; tasteScore: number | null } | null;
}

export default function RecordForm({ space, spaceTags, visitCount, previousRecord }: Props) {
  const tagsToShow = spaceTags.length > 0 ? spaceTags : ALL_TAGS;
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tasteScore, setTasteScore] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  const isRevisit = visitCount > 0;
  const visitNumber = visitCount + 1;

  // 레거시 태그 선택 (ENABLE_RECORD_TAG_SELECTION 켜졌을 때만 사용)
  function toggleTag(tag: Tag) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }

  const canSubmit = ENABLE_RECORD_TAG_SELECTION
    ? selectedTags.length > 0
    : tasteScore !== null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spaceId: space.id,
        memo,
        tasteScore,
        ...(ENABLE_RECORD_TAG_SELECTION ? { tags: selectedTags } : {}),
      }),
    });
    if (res.ok) {
      const params = new URLSearchParams({ name: space.name });
      if (tasteScore !== null) params.set("score", String(tasteScore));
      if (ENABLE_RECORD_TAG_SELECTION && selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      router.push(`/space/${space.slug}/done?${params.toString()}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 / RECORD</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <button onClick={() => router.back()} className="text-xs" style={{ color: "var(--dim)" }}>&lt; back</button>
        <p className="text-base">&gt; {space.name}</p>
      </div>

      {isRevisit && (
        <div className="space-y-2 p-3 border" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--fg)" }}>// {visitNumber}번째 방문입니다</p>
          {previousRecord?.tasteScore != null && (
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              지난번 취향 적합도: {previousRecord.tasteScore}/5
            </p>
          )}
          <div className="flex items-start gap-2 text-xs" style={{ color: "var(--dim)" }}>
            <span className="flex-shrink-0">지난번:</span>
            <span className="italic leading-relaxed">
              &ldquo;{previousRecord?.memo || "기록 없음"}&rdquo;
            </span>
          </div>
          {previousRecord && previousRecord.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {previousRecord.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* A. 공간 취향 태그 — 선택 불가, 공간의 결 설명용 */}
      {!ENABLE_RECORD_TAG_SELECTION && spaceTags.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>// 이 공간은 이런 결을 가지고 있어요</p>
          <div className="flex flex-wrap gap-2">
            {spaceTags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 border select-none"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* B. 취향 적합도 평가 (필수) */}
      {!ENABLE_RECORD_TAG_SELECTION && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--dim)" }}>// 이 공간은 당신의 취향과 얼마나 가까웠나요?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = tasteScore === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTasteScore(n)}
                  className="flex-1 py-3 text-sm border transition-colors"
                  style={{
                    borderColor: active ? "var(--fg)" : "var(--border)",
                    background: active ? "var(--fg)" : "transparent",
                    color: active ? "var(--bg)" : "var(--dim)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-xs" style={{ color: "var(--border)" }}>
            <span>전혀 맞지 않음</span>
            <span>매우 잘 맞음</span>
          </div>
          {tasteScore !== null && (
            <p className="text-xs" style={{ color: "var(--fg)" }}>
              &gt; {tasteScore}점 — {SCORE_LABELS[tasteScore]}
            </p>
          )}
        </div>
      )}

      {/* 레거시: 태그 2개 선택 (ENABLE_RECORD_TAG_SELECTION = true 로 복구) */}
      {ENABLE_RECORD_TAG_SELECTION && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs" style={{ color: "var(--dim)" }}>// {isRevisit ? "이번엔 어땠나요?" : "이 공간 어땠나요?"}</p>
            <p className="text-xs" style={{ color: selectedTags.length >= MAX_TAGS ? "var(--fg)" : "var(--dim)" }}>{selectedTags.length}/{MAX_TAGS}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tagsToShow.map((tag) => (
              <TagChip key={tag} label={TAG_LABELS[tag]} selected={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)} disabled={!selectedTags.includes(tag) && selectedTags.length >= MAX_TAGS} />
            ))}
          </div>
          {selectedTags.length >= MAX_TAGS && (
            <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 최대 {MAX_TAGS}개까지 고를 수 있어.</p>
          )}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* C. 한 줄 기록 (선택) */}
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>// 한 줄로 남겨볼까요? (선택)</p>
        <textarea value={memo} onChange={(e) => { if (e.target.value.length <= MAX_MEMO) setMemo(e.target.value); }}
          placeholder="오늘 이 공간은 어떤 느낌이었나요?" rows={4}
          className="w-full text-sm p-3 resize-none outline-none border"
          style={{ background: "var(--bg)", color: "var(--fg)", borderColor: memo.length > 80 ? "var(--fg)" : "var(--border)", transition: "border-color 0.2s" }} />
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit || loading}
        className="w-full text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-30"
        style={{ borderColor: "var(--fg)" }}>
        {loading ? "// 저장 중..." : "[[ 저장하기 ]]"}
      </button>
    </main>
  );
}
