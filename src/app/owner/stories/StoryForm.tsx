"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SpaceOption {
  id: string;
  name: string;
  type: string;
  district: string | null;
}

interface StoryFormProps {
  mode: "new" | "edit";
  initialData?: {
    id: string;
    type: "REGION" | "TASTE";
    title: string;
    slug: string;
    district: string | null;
    persona: string | null;
    intro: string;
    body: string;
    cta: string | null;
    publishedAt: string | null;
    isActive: boolean;
    spaceIds: string[];
  };
  spaces: SpaceOption[];
}

export default function StoryForm({ mode, initialData, spaces }: StoryFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState<"REGION" | "TASTE">(initialData?.type ?? "REGION");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [district, setDistrict] = useState(initialData?.district ?? "");
  const [persona, setPersona] = useState(initialData?.persona ?? "");
  const [intro, setIntro] = useState(initialData?.intro ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [cta, setCta] = useState(initialData?.cta ?? "");
  const [publishedAt, setPublishedAt] = useState(
    initialData?.publishedAt ? initialData.publishedAt.slice(0, 16) : ""
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>(initialData?.spaceIds ?? []);

  function toggleSpace(id: string) {
    setSelectedSpaceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      type,
      title,
      slug,
      district: district || null,
      persona: persona || null,
      intro,
      body,
      cta: cta || null,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
      isActive,
      spaceIds: selectedSpaceIds,
    };

    try {
      const url = mode === "new" ? "/api/stories" : `/api/stories/${initialData!.id}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "저장 실패");
      }
      router.push("/owner/stories");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]";
  const inputStyle = { borderColor: "var(--border)", color: "var(--fg)" };
  const labelClass = "text-xs uppercase tracking-widest";
  const labelStyle = { color: "var(--dim)" };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* 타입 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>타입</p>
        <div className="flex gap-3">
          {(["REGION", "TASTE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="text-xs px-3 py-1.5 border transition-colors"
              style={{
                borderColor: type === t ? "var(--fg)" : "var(--border)",
                color: type === t ? "var(--fg)" : "var(--dim)",
                background: type === t ? "var(--fg)" : "transparent",
              }}
            >
              <span style={{ color: type === t ? "var(--bg)" : "var(--dim)" }}>
                {t === "REGION" ? "지역 이야기" : "취향 이야기"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>제목 — 취향이 드러나는 한 줄 문장</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="효창공원역은 일부러 오지 않으면 오지 않는 동네다"
          required
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>슬러그 (URL)</p>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="hyochang-park-quiet"
          required
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* 지역 / 페르소나 */}
      {type === "REGION" ? (
        <div className="space-y-2">
          <p className={labelClass} style={labelStyle}>지역</p>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="효창공원"
            className={inputClass}
            style={inputStyle}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <p className={labelClass} style={labelStyle}>인물 — 익명 취향 페르소나</p>
          <input
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="퇴근 후 혼자 걷는 직장인"
            className={inputClass}
            style={inputStyle}
          />
        </div>
      )}

      {/* 도입부 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>도입부 — 현재 상태나 배경</p>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={4}
          required
          className={inputClass}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* 본문 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>
          {type === "REGION" ? "본문 — 지역/공간의 분위기 해석" : "본문 — 취향과 장면"}
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          required
          className={inputClass}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>CTA 텍스트 (선택)</p>
        <input
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          placeholder="이 흐름 따라가기"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* 관련 공간 선택 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>관련 공간 (3~5개 권장)</p>
        <div className="space-y-2 max-h-60 overflow-y-auto border p-3" style={{ borderColor: "var(--border)" }}>
          {spaces.map((space) => {
            const selected = selectedSpaceIds.includes(space.id);
            return (
              <button
                key={space.id}
                type="button"
                onClick={() => toggleSpace(space.id)}
                className="flex items-center gap-3 w-full text-left py-1.5"
              >
                <span
                  className="w-4 h-4 flex-shrink-0 border flex items-center justify-center text-xs"
                  style={{ borderColor: selected ? "var(--fg)" : "var(--border)", background: selected ? "var(--fg)" : "transparent" }}
                >
                  {selected && <span style={{ color: "var(--bg)" }}>✓</span>}
                </span>
                <span className="text-sm">{space.name}</span>
                <span className="text-xs ml-auto" style={{ color: "var(--dim)" }}>
                  {[space.type, space.district].filter(Boolean).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          선택됨: {selectedSpaceIds.length}개
        </p>
      </div>

      {/* 발행일 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>발행일 (비어있으면 미발행)</p>
        <input
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* 활성 여부 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className="w-10 h-5 border relative transition-colors"
          style={{ borderColor: "var(--border)", background: isActive ? "var(--fg)" : "transparent" }}
        >
          <span
            className="absolute top-0.5 w-3.5 h-3.5 transition-all"
            style={{
              left: isActive ? "calc(100% - 1rem)" : "0.1rem",
              background: isActive ? "var(--bg)" : "var(--dim)",
            }}
          />
        </button>
        <p className="text-xs" style={{ color: "var(--dim)" }}>활성화</p>
      </div>

      {error && <p className="text-xs" style={{ color: "#e05" }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="py-3 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : mode === "new" ? "스토리 만들기" : "저장하기"}
      </button>
    </form>
  );
}
