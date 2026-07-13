"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagKey } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "@/lib/tags";
import Image from "next/image";
import ImagePositionEditor from "@/components/ImagePositionEditor";

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
  spaceTags: string[];
  imageUrl?: string;
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
  ownerName?: string;
  ownerPhotoUrl?: string;
  ownerBio?: string;
}

interface Props {
  mode: "new" | "edit";
  space?: SpaceData;
}

const SPACE_TYPES = ["독립서점", "소품샵", "전시공간", "개인 영화관", "문화 카페", "복합문화공간"];
const DISTRICTS = ["서촌", "성수", "망원", "북촌", "가로수길", "이태원", "홍대", "연남동", "한남동", "익선동"];
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

export default function SpaceForm({ mode, space }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 운영자 한마디
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState(space?.ownerPhotoUrl ?? "");
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState(space?.ownerPhotoUrl ?? "");
  const [ownerPhotoUploading, setOwnerPhotoUploading] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    ownerName: space?.ownerName ?? "",
    ownerBio: space?.ownerBio ?? "",
  });

  // 대표 이미지 — 위치/확대 조절 포함
  const [heroImage, setHeroImage] = useState({
    imageUrl: space?.imageUrl ?? "",
    zoom: space?.imageZoom ?? 1,
    positionX: space?.imagePositionX ?? 0.5,
    positionY: space?.imagePositionY ?? 0.5,
  });

  const [selectedSpaceTags, setSelectedSpaceTags] = useState<TagKey[]>(
    (space?.spaceTags ?? []) as TagKey[]
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
  });

  const MAX_SPACE_TAGS = 7;

  function handleOwnerChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setOwnerForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleOwnerPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOwnerPhotoPreview(URL.createObjectURL(file));
    setOwnerPhotoUploading(true);
    const url = await uploadToCloudinary(file);
    setOwnerPhotoUploading(false);
    if (url) {
      setOwnerPhotoUrl(url);
      setOwnerPhotoPreview(url);
    }
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

  function toggleSpaceTag(tag: TagKey) {
    setSelectedSpaceTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_SPACE_TAGS) return prev;
      return [...prev, tag];
    });
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
      body: JSON.stringify({
        ...form,
        imageUrl: heroImage.imageUrl || null,
        imageZoom: heroImage.zoom,
        imagePositionX: heroImage.positionX,
        imagePositionY: heroImage.positionY,
        spaceTags: selectedSpaceTags,
        ...ownerForm,
        ownerPhotoUrl: ownerPhotoUrl || null,
      }),
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

  const inputStyle = { background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)", outline: "none" };

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="flex justify-between items-center">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          {mode === "new" ? "새 공간 등록" : "공간 수정"}
        </p>
        <button onClick={() => router.back()} className="text-xs" style={{ color: "var(--dim)" }}>← 뒤로</button>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* 대표 이미지 — 공간 상세 페이지 비율(16:11) 고정, 위치/확대 조절 가능 */}
        <ImagePositionEditor
          label="대표 이미지 (선택)"
          value={heroImage}
          onChange={setHeroImage}
          aspectRatio="16/11"
        />

        {/* 기본 정보 */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>기본 정보</p>

        <Field label="공간 이름 *">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="북성로 헌책방"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="공간 주소 (영문, 하이픈만) *">
          <input name="slug" value={form.slug} onChange={handleChange} required placeholder="bukseong-books"
            className="w-full text-sm px-3 py-2.5 border font-mono" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>/space/{form.slug || "..."}</p>
        </Field>

        <Field label="공간 유형 *">
          <select name="type" value={form.type} onChange={handleChange} required
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle}>
            <option value="">선택</option>
            {SPACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="지역 *">
          <select name="district" value={form.district} onChange={handleChange} required
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle}>
            <option value="">선택</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>

        <Field label="상세 위치 *">
          <input name="location" value={form.location} onChange={handleChange} required placeholder="서울 마포구 망원동"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="네이버 지도 링크 (선택)">
          <input name="naverMapUrl" value={form.naverMapUrl} onChange={handleChange} placeholder="https://naver.me/..."
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="운영 시간 (선택)">
          <input name="openingHours" value={form.openingHours} onChange={handleChange} placeholder="화~일 12:00–21:00 / 월 휴무"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="핵심 한 줄 (선택)">
          <input name="tagline" value={form.tagline} onChange={handleChange} placeholder="생각이 많아지는 날, 글을 쓰는 공간"
            className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        {/* 기본 소개 */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>기본 소개</p>

        <Field label="간단 소개 * (검색 결과·공유 링크에 노출됩니다)">
          <textarea name="description" value={form.description} onChange={handleChange} required
            placeholder="이 공간을 한두 문장으로 짧게 소개해줘."
            rows={3} className="w-full text-sm px-3 py-2.5 border resize-none" style={inputStyle} />
        </Field>

        {mode === "edit" && space && (
          <a
            href={`/owner/${space.id}/episodes`}
            className="block text-xs py-2.5 px-3 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            방문자에게 보여줄 이야기는 에피소드에서 관리해 →
          </a>
        )}

        {/* 운영자 한마디 */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영자 한마디</p>

        <Field label="운영자 이름/닉네임 (선택)">
          <input name="ownerName" value={ownerForm.ownerName} onChange={handleOwnerChange}
            placeholder="김책방" className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="운영자 사진 (선택)">
          <label className="block cursor-pointer">
            <div className="w-20 h-20 rounded-full border flex items-center justify-center overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
              {ownerPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ownerPhotoPreview} alt="owner" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-center" style={{ color: "var(--dim)" }}>사진</span>
              )}
              {ownerPhotoUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <span className="text-xs" style={{ color: "var(--fg)" }}>...</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleOwnerPhotoChange} className="hidden" />
          </label>
        </Field>

        <Field label="운영자 한마디 (선택)">
          <textarea name="ownerBio" value={ownerForm.ownerBio} onChange={handleOwnerChange}
            placeholder="방문객에게 남기고 싶은 짧은 한마디 (예: 오늘도 편하게 머물다 가셨으면 좋겠습니다.)"
            rows={2} className="w-full text-sm px-3 py-2.5 border resize-none" style={inputStyle} />
        </Field>

        {/* 태그 */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
              방문자 태그 (최대 {MAX_SPACE_TAGS}개)
            </p>
            <p className="text-xs" style={{ color: selectedSpaceTags.length >= MAX_SPACE_TAGS ? "var(--fg)" : "var(--dim)" }}>
              {selectedSpaceTags.length}/{MAX_SPACE_TAGS}
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--dim)" }}>방문자가 기록할 때 이 태그 중 2개를 고르게 돼.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => {
              const selected = selectedSpaceTags.includes(tag);
              const disabled = !selected && selectedSpaceTags.length >= MAX_SPACE_TAGS;
              return (
                <button key={tag} type="button" onClick={() => toggleSpaceTag(tag)} disabled={disabled}
                  className="px-3 py-1.5 text-xs border transition-colors disabled:opacity-30"
                  style={selected
                    ? { borderColor: "var(--fg)", background: "var(--fg)", color: "var(--bg)" }
                    : { borderColor: "var(--border)", color: "var(--dim)" }}>
                  {TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-30"
          style={{ borderColor: "var(--fg)" }}>
          {loading ? "저장 중..." : mode === "new" ? "공간 등록하기" : "수정 완료"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{label}</label>
      {children}
    </div>
  );
}
