"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "@/lib/tags";
import Image from "next/image";

type StoryItem =
  | { type: "qa"; q: string; a: string }
  | { type: "image"; url: string };

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
  storyItems?: StoryItem[];
  spaceTags: string[];
  imageUrl?: string;
  ownerName?: string;
  ownerPhotoUrl?: string;
  ownerBio?: string;
  ownerValues?: string;
  ownerPlaylistUrl?: string;
  ownerBlogUrl?: string;
  ownerSocialUrl?: string;
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

  // 운영자 이야기
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState(space?.ownerPhotoUrl ?? "");
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState(space?.ownerPhotoUrl ?? "");
  const [ownerPhotoUploading, setOwnerPhotoUploading] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    ownerName: space?.ownerName ?? "",
    ownerBio: space?.ownerBio ?? "",
    ownerValues: space?.ownerValues ?? "",
    ownerPlaylistUrl: space?.ownerPlaylistUrl ?? "",
    ownerBlogUrl: space?.ownerBlogUrl ?? "",
    ownerSocialUrl: space?.ownerSocialUrl ?? "",
  });

  // 대표 이미지
  const [imageUrl, setImageUrl] = useState(space?.imageUrl ?? "");
  const [imagePreview, setImagePreview] = useState(space?.imageUrl ?? "");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // 인터뷰 스토리 아이템
  const [storyItems, setStoryItems] = useState<StoryItem[]>(space?.storyItems ?? []);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

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

  async function handleMainImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageError("");
    setImageUploading(true);
    const url = await uploadToCloudinary(file);
    setImageUploading(false);
    if (url) {
      setImageUrl(url);
      setImagePreview(url);
    } else {
      setImageError("이미지 업로드에 실패했어요. 다시 시도해봐.");
    }
  }

  // 스토리 아이템 조작
  function addQA() {
    setStoryItems((prev) => [...prev, { type: "qa", q: "", a: "" }]);
  }
  function addImage() {
    setStoryItems((prev) => [...prev, { type: "image", url: "" }]);
  }
  function removeItem(i: number) {
    setStoryItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveItem(i: number, dir: -1 | 1) {
    setStoryItems((prev) => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  function updateQA(i: number, field: "q" | "a", value: string) {
    setStoryItems((prev) =>
      prev.map((item, idx) =>
        idx === i && item.type === "qa" ? { ...item, [field]: value } : item
      )
    );
  }
  async function handleStoryImageChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setStoryItems((prev) =>
      prev.map((item, idx) => idx === i && item.type === "image" ? { ...item, url: localUrl } : item)
    );
    setUploadingIndex(i);
    const url = await uploadToCloudinary(file);
    setUploadingIndex(null);
    if (url) {
      setStoryItems((prev) =>
        prev.map((item, idx) => idx === i && item.type === "image" ? { ...item, url } : item)
      );
    }
  }

  function toggleSpaceTag(tag: Tag) {
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
        imageUrl: imageUrl || null,
        storyItems: storyItems.length > 0 ? storyItems : null,
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

        {/* 대표 이미지 */}
        <Field label="대표 이미지 (선택)">
          <label className="block cursor-pointer">
            <div className="w-full h-44 border flex items-center justify-center overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs" style={{ color: "var(--dim)" }}>클릭해서 이미지 선택</span>
              )}
              {imageUploading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <span className="text-xs" style={{ color: "var(--fg)" }}>업로드 중...</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleMainImageChange} className="hidden" />
          </label>
          {imageError && <p className="text-xs mt-1 text-red-400">{imageError}</p>}
          {imageUrl && !imageError && <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>✓ 업로드 완료</p>}
        </Field>

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

        {/* 공간 이야기 */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간 이야기</p>

        <Field label="리드 텍스트 *">
          <textarea name="description" value={form.description} onChange={handleChange} required
            placeholder="이 공간이 어떤 곳인지 소개해줘. 독자가 처음 읽는 문단이야."
            rows={4} className="w-full text-sm px-3 py-2.5 border resize-none" style={inputStyle} />
        </Field>

        {/* 동적 인터뷰 아이템 */}
        {storyItems.length > 0 && (
          <div className="space-y-4">
            {storyItems.map((item, i) => (
              <div key={i} className="border p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
                {/* 컨트롤 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
                    {item.type === "qa" ? "Q&A" : "이미지"}
                  </span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0}
                      className="text-xs disabled:opacity-20" style={{ color: "var(--dim)" }}>↑</button>
                    <button type="button" onClick={() => moveItem(i, 1)} disabled={i === storyItems.length - 1}
                      className="text-xs disabled:opacity-20" style={{ color: "var(--dim)" }}>↓</button>
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-xs" style={{ color: "var(--dim)" }}>×</button>
                  </div>
                </div>

                {item.type === "qa" && (
                  <>
                    <input
                      value={item.q}
                      onChange={(e) => updateQA(i, "q", e.target.value)}
                      placeholder="질문을 입력해줘 (예: 이 공간을 만든 이유가 뭔가요?)"
                      className="w-full text-sm px-3 py-2.5 border"
                      style={inputStyle}
                    />
                    <textarea
                      value={item.a}
                      onChange={(e) => updateQA(i, "a", e.target.value)}
                      placeholder="답변을 입력해줘"
                      rows={4}
                      className="w-full text-sm px-3 py-2.5 border resize-none"
                      style={inputStyle}
                    />
                  </>
                )}

                {item.type === "image" && (
                  <label className="block cursor-pointer">
                    <div className="w-full h-40 border flex items-center justify-center overflow-hidden relative"
                      style={{ borderColor: "var(--border)" }}>
                      {item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs" style={{ color: "var(--dim)" }}>
                          {uploadingIndex === i ? "업로드 중..." : "클릭해서 이미지 선택"}
                        </span>
                      )}
                      {uploadingIndex === i && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <span className="text-xs" style={{ color: "var(--fg)" }}>업로드 중...</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleStoryImageChange(i, e)} className="hidden" />
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 아이템 추가 버튼 */}
        <div className="flex gap-3">
          <button type="button" onClick={addQA}
            className="flex-1 text-sm py-2.5 border transition-colors hover:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            + 질문 추가
          </button>
          <button type="button" onClick={addImage}
            className="flex-1 text-sm py-2.5 border transition-colors hover:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            + 이미지 추가
          </button>
        </div>

        {/* 운영자 이야기 */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영자의 이야기</p>

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

        <Field label="운영자 이야기 (선택)">
          <textarea name="ownerBio" value={ownerForm.ownerBio} onChange={handleOwnerChange}
            placeholder="어떻게 이 공간을 시작하게 됐는지, 어떤 사람인지 자유롭게 써줘."
            rows={5} className="w-full text-sm px-3 py-2.5 border resize-none" style={inputStyle} />
        </Field>

        <Field label="가장 중요하게 생각하는 가치 (선택)">
          <textarea name="ownerValues" value={ownerForm.ownerValues} onChange={handleOwnerChange}
            placeholder="공간을 운영하면서 가장 지키고 싶은 것, 손님에게 전하고 싶은 것"
            rows={3} className="w-full text-sm px-3 py-2.5 border resize-none" style={inputStyle} />
        </Field>

        <Field label="플레이리스트 링크 (선택)">
          <input name="ownerPlaylistUrl" value={ownerForm.ownerPlaylistUrl} onChange={handleOwnerChange}
            placeholder="https://open.spotify.com/..." className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="블로그 링크 (선택)">
          <input name="ownerBlogUrl" value={ownerForm.ownerBlogUrl} onChange={handleOwnerChange}
            placeholder="https://brunch.co.kr/..." className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
        </Field>

        <Field label="SNS 링크 (선택)">
          <input name="ownerSocialUrl" value={ownerForm.ownerSocialUrl} onChange={handleOwnerChange}
            placeholder="https://instagram.com/..." className="w-full text-sm px-3 py-2.5 border" style={inputStyle} />
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

        <button type="submit" disabled={loading || imageUploading}
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
