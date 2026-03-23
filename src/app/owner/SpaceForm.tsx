"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "@/lib/tags";

interface SpaceData {
  id: string;
  name: string;
  slug: string;
  type: string;
  district: string;
  location: string;
  tagline: string;
  openingHours: string;
  naverMapUrl: string;
  description: string;
  philosophy: string;
  ownerMessage: string;
  experienceGuide: string;
  spacePoints: string;
  spaceTags: string[];
  imageUrl?: string;
}

interface Props {
  mode: "new" | "edit";
  space?: SpaceData;
}

const SPACE_TYPES = ["독립서점", "소품샵", "전시공간", "개인 영화관", "문화 카페", "복합문화공간"];
const DISTRICTS = ["서촌", "성수", "망원", "북촌", "가로수길", "이태원", "홍대", "연남동", "한남동", "익선동"];

export default function SpaceForm({ mode, space }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(space?.imageUrl ?? "");
  const [imagePreview, setImagePreview] = useState(space?.imageUrl ?? "");
  const [imageUploading, setImageUploading] = useState(false);

  const [selectedSpaceTags, setSelectedSpaceTags] = useState<Tag[]>(
    (space?.spaceTags ?? []) as Tag[]
  );

  const [form, setForm] = useState({
    name: space?.name ?? "",
    slug: space?.slug ?? "",
    type: space?.type ?? "",
    district: space?.district ?? "",
    location: space?.location ?? "",
    tagline: space?.tagline ?? "",
    openingHours: space?.openingHours ?? "",
    naverMapUrl: space?.naverMapUrl ?? "",
    description: space?.description ?? "",
    philosophy: space?.philosophy ?? "",
    ownerMessage: space?.ownerMessage ?? "",
    experienceGuide: space?.experienceGuide ?? "",
    spacePoints: space?.spacePoints ?? "",
  });

  const MAX_SPACE_TAGS = 7;

  function toggleSpaceTag(tag: Tag) {
    setSelectedSpaceTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_SPACE_TAGS) return prev;
      return [...prev, tag];
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "name" && mode === "new") {
        next.slug = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return next;
    });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setImageUploading(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: data }
      );
      const result = await res.json();
      if (result.secure_url) {
        setImageUrl(result.secure_url);
        setImagePreview(result.secure_url);
      }
    } catch {
      setImagePreview("");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const url = mode === "new" ? "/api/spaces" : `/api/spaces/${space!.id}`;
    const method = mode === "new" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, imageUrl: imageUrl || null, spaceTags: selectedSpaceTags }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "오류가 발생했어요.");
      setLoading(false);
      return;
    }
    router.push("/owner");
    router.refresh();
  }

  const inputStyle = {
    background: "var(--bg)",
    color: "var(--fg)",
    borderColor: "var(--border)",
    outline: "none",
  };

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">SPACECUBE / OWNER / {mode === "new" ? "NEW" : "EDIT"}</p>
          <button onClick={() => router.back()} className="text-xs" style={{ color: "var(--dim)" }}>&lt; back</button>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── 기본 정보 ── */}
        <p className="text-xs" style={{ color: "var(--dim)" }}>// 기본 정보</p>

        <Field label="대표 이미지 (선택)">
          <label className="block cursor-pointer">
            <div className="w-full h-36 border flex items-center justify-center overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover opacity-70" />
              ) : (
                <span className="text-xs" style={{ color: "var(--dim)" }}>
                  {imageUploading ? "// 업로드 중..." : "> 클릭해서 이미지 선택"}
                </span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </Field>

        <Field label="공간 이름 *">
          <input name="name" value={form.name} onChange={handleChange} required
            placeholder="북성로 헌책방"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

        <Field label="공간 주소 (영문, 하이픈만) *">
          <input name="slug" value={form.slug} onChange={handleChange} required
            placeholder="bukseong-books"
            className="w-full text-sm px-3 py-2 border font-mono" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>
            &gt; /space/{form.slug || "..."}
          </p>
        </Field>

        <Field label="공간 유형 *">
          <select name="type" value={form.type} onChange={handleChange} required
            className="w-full text-sm px-3 py-2 border" style={inputStyle}>
            <option value="">선택</option>
            {SPACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="지역 *">
          <select name="district" value={form.district} onChange={handleChange} required
            className="w-full text-sm px-3 py-2 border" style={inputStyle}>
            <option value="">선택</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>

        <Field label="상세 위치 *">
          <input name="location" value={form.location} onChange={handleChange} required
            placeholder="서울 마포구 망원동"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

        <Field label="네이버 지도 링크 (선택)">
          <input name="naverMapUrl" value={form.naverMapUrl} onChange={handleChange}
            placeholder="https://naver.me/..."
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

        <Field label="운영 시간 (선택)">
          <input name="openingHours" value={form.openingHours} onChange={handleChange}
            placeholder="화~일 12:00–21:00 / 월 휴무"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

        {/* ── 공간 이야기 ── */}
        <p className="text-xs" style={{ color: "var(--dim)" }}>// 공간 이야기</p>

        <Field label="핵심 한 줄 (선택)">
          <input name="tagline" value={form.tagline} onChange={handleChange}
            placeholder="생각이 많아지는 날, 글을 쓰는 공간"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>
            &gt; 방문 전 보이는 공간의 첫 인상
          </p>
        </Field>

        <Field label="공간 소개 *">
          <textarea name="description" value={form.description} onChange={handleChange} required
            placeholder="이 공간이 어떤 곳인지 소개해줘."
            rows={3} className="w-full text-sm px-3 py-2 border resize-none" style={inputStyle} />
        </Field>

        <Field label="왜 만들었나 *">
          <textarea name="philosophy" value={form.philosophy} onChange={handleChange} required
            placeholder="이 공간을 만든 이유, 담긴 이야기."
            rows={3} className="w-full text-sm px-3 py-2 border resize-none" style={inputStyle} />
        </Field>

        <Field label="운영자 한마디 (선택)">
          <input name="ownerMessage" value={form.ownerMessage} onChange={handleChange}
            placeholder="방문자에게 전하고 싶은 말"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

        {/* ── QR 스캔 후 콘텐츠 ── */}
        <p className="text-xs" style={{ color: "var(--dim)" }}>// QR 스캔 후 콘텐츠</p>

        <Field label="경험 가이드 (선택)">
          <textarea name="experienceGuide" value={form.experienceGuide} onChange={handleChange}
            placeholder="이쪽은 ~하는 존입니다. 공간은 이렇게 나눠져 있습니다."
            rows={3} className="w-full text-sm px-3 py-2 border resize-none" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>
            &gt; 공간을 어떻게 경험하면 좋은지
          </p>
        </Field>

        <Field label="공간 포인트 (선택)">
          <textarea name="spacePoints" value={form.spacePoints} onChange={handleChange}
            placeholder="저녁이 되면 창가에 비치는 나무가 예쁩니다."
            rows={3} className="w-full text-sm px-3 py-2 border resize-none" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>
            &gt; 이 공간만의 숨겨진 포인트
          </p>
        </Field>

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

        {/* ── 공간 태그 ── */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs" style={{ color: "var(--dim)" }}>// 방문자에게 보여줄 태그 (최대 {MAX_SPACE_TAGS}개)</p>
            <p className="text-xs" style={{ color: selectedSpaceTags.length >= MAX_SPACE_TAGS ? "var(--fg)" : "var(--dim)" }}>
              {selectedSpaceTags.length}/{MAX_SPACE_TAGS}
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; 방문자가 기록할 때 이 태그 중 2개를 고르게 돼.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => {
              const selected = selectedSpaceTags.includes(tag);
              const disabled = !selected && selectedSpaceTags.length >= MAX_SPACE_TAGS;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSpaceTag(tag)}
                  disabled={disabled}
                  className="px-3 py-1 text-xs border transition-colors disabled:opacity-30"
                  style={
                    selected
                      ? { borderColor: "var(--fg)", background: "var(--fg)", color: "var(--bg)" }
                      : { borderColor: "var(--border)", color: "var(--dim)" }
                  }
                >
                  {selected ? `[${TAG_LABELS[tag]}]` : TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
          {selectedSpaceTags.length === 0 && (
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              &gt; 선택 안 하면 전체 태그가 보여져.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-red-400">&gt; ERROR: {error}</p>}

        <button
          type="submit"
          disabled={loading || imageUploading}
          className="w-full text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-30"
          style={{ borderColor: "var(--fg)" }}
        >
          {loading ? "// 저장 중..." : mode === "new" ? "[[ 공간 등록하기 ]]" : "[[ 수정 완료 ]]"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs" style={{ color: "var(--dim)" }}>&gt; {label}</label>
      {children}
    </div>
  );
}
