"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SpaceData {
  id: string;
  name: string;
  slug: string;
  type: string;
  location: string;
  description: string;
  philosophy: string;
  ownerMessage: string;
  imageUrl?: string;
}

interface Props {
  mode: "new" | "edit";
  space?: SpaceData;
}

const SPACE_TYPES = ["독립서점", "소품샵", "전시공간", "개인 영화관", "문화 카페", "복합문화공간"];

export default function SpaceForm({ mode, space }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(space?.imageUrl ?? "");
  const [imagePreview, setImagePreview] = useState(space?.imageUrl ?? "");
  const [imageUploading, setImageUploading] = useState(false);

  const [form, setForm] = useState({
    name: space?.name ?? "",
    slug: space?.slug ?? "",
    type: space?.type ?? "",
    location: space?.location ?? "",
    description: space?.description ?? "",
    philosophy: space?.philosophy ?? "",
    ownerMessage: space?.ownerMessage ?? "",
  });

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
      body: JSON.stringify({ ...form, imageUrl: imageUrl || null }),
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
        <Field label="// 대표 이미지 (선택)">
          <label className="block cursor-pointer">
            <div className="w-full h-36 border flex items-center justify-center overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover opacity-70" />
              ) : (
                <span className="text-xs" style={{ color: "var(--dim)" }}>
                  {imageUploading ? "// 업로드 중..." : "&gt; 클릭해서 이미지 선택"}
                </span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </Field>

        <Field label="// 공간 이름 *">
          <input name="name" value={form.name} onChange={handleChange} required
            placeholder="북성로 헌책방"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

        <Field label="// 공간 주소 (영문, 하이픈만) *">
          <input name="slug" value={form.slug} onChange={handleChange} required
            placeholder="bukseong-books"
            className="w-full text-sm px-3 py-2 border font-mono" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--dim)" }}>
            &gt; /space/{form.slug || "..."}
          </p>
        </Field>

        <Field label="// 공간 유형 *">
          <select name="type" value={form.type} onChange={handleChange} required
            className="w-full text-sm px-3 py-2 border" style={inputStyle}>
            <option value="">선택</option>
            {SPACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="// 위치 *">
          <input name="location" value={form.location} onChange={handleChange} required
            placeholder="서울 마포구"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

        <Field label="// 공간 소개 *">
          <textarea name="description" value={form.description} onChange={handleChange} required
            placeholder="이 공간이 어떤 곳인지 소개해줘."
            rows={3} className="w-full text-sm px-3 py-2 border resize-none" style={inputStyle} />
        </Field>

        <Field label="// 공간 철학 *">
          <textarea name="philosophy" value={form.philosophy} onChange={handleChange} required
            placeholder="이 공간을 만든 이유, 담긴 철학."
            rows={3} className="w-full text-sm px-3 py-2 border resize-none" style={inputStyle} />
        </Field>

        <Field label="// 운영자 한마디 (선택)">
          <input name="ownerMessage" value={form.ownerMessage} onChange={handleChange}
            placeholder="방문자에게 전하고 싶은 말"
            className="w-full text-sm px-3 py-2 border" style={inputStyle} />
        </Field>

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
      <label className="text-xs" style={{ color: "var(--dim)" }}>{label}</label>
      {children}
    </div>
  );
}
