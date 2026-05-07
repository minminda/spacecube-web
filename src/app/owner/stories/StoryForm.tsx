"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SpaceOption {
  id: string;
  name: string;
  type: string;
  district: string | null;
}

export type Block =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption: string };

interface StoryFormProps {
  mode: "new" | "edit";
  initialData?: {
    id: string;
    type: "REGION" | "TASTE";
    title: string;
    slug: string;
    district: string | null;
    persona: string | null;
    imageUrl: string | null;
    intro: string;
    body: string;
    bodyBlocks: Block[] | null;
    cta: string | null;
    publishedAt: string | null;
    isActive: boolean;
    spaceIds: string[];
  };
  spaces: SpaceOption[];
}

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(file: File): Promise<string | null> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  try {
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
    const result = await res.json();
    return result.secure_url ?? null;
  } catch {
    return null;
  }
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
  const [cta, setCta] = useState(initialData?.cta ?? "");
  const [publishedAt, setPublishedAt] = useState(
    initialData?.publishedAt ? initialData.publishedAt.slice(0, 16) : ""
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>(initialData?.spaceIds ?? []);

  // 대표 이미지
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl ?? "");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  // 블록 에디터
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialData?.bodyBlocks && initialData.bodyBlocks.length > 0) {
      return initialData.bodyBlocks;
    }
    if (initialData?.body) {
      return [{ type: "text", content: initialData.body }];
    }
    return [];
  });
  const [blockUploadingIndex, setBlockUploadingIndex] = useState<number | null>(null);

  async function handleHeroImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageUploadError("");
    setImageUploading(true);
    const url = await uploadToCloudinary(file);
    setImageUploading(false);
    if (url) {
      setImageUrl(url);
      setImagePreview(url);
    } else {
      setImageUploadError("이미지 업로드에 실패했어요. 다시 시도해주세요.");
    }
  }

  async function handleBlockImageChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    updateBlock(i, { url: localUrl });
    setBlockUploadingIndex(i);
    const url = await uploadToCloudinary(file);
    setBlockUploadingIndex(null);
    if (url) {
      updateBlock(i, { url });
    }
  }

  function addTextBlock() {
    setBlocks((prev) => [...prev, { type: "text", content: "" }]);
  }
  function addImageBlock() {
    setBlocks((prev) => [...prev, { type: "image", url: "", caption: "" }]);
  }
  function removeBlock(i: number) {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateBlock(i: number, patch: Partial<Block>) {
    setBlocks((prev) =>
      prev.map((b, idx) => (idx === i ? { ...b, ...patch } as Block : b))
    );
  }

  function toggleSpace(id: string) {
    setSelectedSpaceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const derivedBody = blocks
      .filter((b): b is { type: "text"; content: string } => b.type === "text")
      .map((b) => b.content)
      .join("\n\n") || " ";

    const payload = {
      type,
      title,
      slug,
      district: district || null,
      persona: persona || null,
      imageUrl: imageUrl || null,
      intro,
      body: derivedBody,
      bodyBlocks: blocks.length > 0 ? blocks : null,
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

      {/* 대표 이미지 — 파일 업로드 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>대표 이미지 (히어로, 선택)</p>
        <label className="block cursor-pointer">
          <div
            className="w-full h-44 border flex items-center justify-center overflow-hidden relative"
            style={{ borderColor: "var(--border)" }}
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs" style={{ color: "var(--dim)" }}>클릭해서 이미지 선택</span>
            )}
            {imageUploading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                <span className="text-xs" style={{ color: "#fff" }}>업로드 중...</span>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleHeroImageChange} className="hidden" />
        </label>
        {imageUploadError && <p className="text-xs" style={{ color: "#e05" }}>{imageUploadError}</p>}
        {imageUrl && !imageUploadError && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>✓ 업로드 완료</p>
        )}
      </div>

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

      {/* 본문 블록 에디터 */}
      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>
          {type === "REGION" ? "본문 — 텍스트 + 이미지 블록" : "본문 — 취향과 장면, 텍스트 + 이미지 블록"}
        </p>

        {blocks.length === 0 && (
          <p className="text-xs" style={{ color: "var(--border)" }}>
            블록을 추가해 본문을 구성하세요.
          </p>
        )}

        <div className="space-y-3">
          {blocks.map((block, i) => (
            <div key={i} className="border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--dim)" }}>
                  {block.type === "text" ? "[ 텍스트 ]" : "[ 이미지 ]"}
                </span>
                <button
                  type="button"
                  onClick={() => removeBlock(i)}
                  className="text-xs px-2 py-0.5"
                  style={{ color: "var(--dim)" }}
                >
                  ✕
                </button>
              </div>

              {block.type === "text" ? (
                <textarea
                  value={block.content}
                  onChange={(e) => updateBlock(i, { content: e.target.value })}
                  rows={5}
                  placeholder="본문 텍스트..."
                  className={inputClass}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              ) : (
                <div className="space-y-2">
                  {/* 이미지 파일 업로드 */}
                  <label className="block cursor-pointer">
                    <div
                      className="w-full h-36 border flex items-center justify-center overflow-hidden relative"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {block.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={block.url} alt="미리보기" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs" style={{ color: "var(--dim)" }}>클릭해서 이미지 선택</span>
                      )}
                      {blockUploadingIndex === i && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <span className="text-xs" style={{ color: "#fff" }}>업로드 중...</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleBlockImageChange(i, e)}
                      className="hidden"
                    />
                  </label>
                  <input
                    value={block.caption}
                    onChange={(e) => updateBlock(i, { caption: e.target.value })}
                    placeholder="캡션 (선택)"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={addTextBlock}
            className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            + 텍스트 블록
          </button>
          <button
            type="button"
            onClick={addImageBlock}
            className="text-xs px-3 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            + 이미지 블록
          </button>
        </div>
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
                  style={{
                    borderColor: selected ? "var(--fg)" : "var(--border)",
                    background: selected ? "var(--fg)" : "transparent",
                  }}
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
        <p className="text-xs" style={{ color: "var(--dim)" }}>선택됨: {selectedSpaceIds.length}개</p>
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
