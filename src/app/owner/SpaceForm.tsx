"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
        next.slug = value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      }
      return next;
    });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 로컬 미리보기 즉시 표시
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

  const inputStyle = { background: "var(--tag-bg)", color: "var(--fg)" };

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-lg" style={{ color: "var(--muted)" }}>←</button>
        <h2 className="text-base font-medium">
          {mode === "new" ? "새 공간 등록" : "공간 정보 수정"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <Field label="대표 이미지 (선택)">
          <label className="block cursor-pointer">
            <div
              className="w-full h-40 rounded-2xl flex items-center justify-center overflow-hidden relative"
              style={{ background: "var(--tag-bg)" }}
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  {imageUploading ? "업로드 중..." : "탭해서 이미지 선택"}
                </span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </Field>

        <Field label="공간 이름 *">
          <input name="name" value={form.name} onChange={handleChange} required
            placeholder="북성로 헌책방"
            className="w-full text-sm rounded-2xl px-4 py-3 outline-none" style={inputStyle} />
        </Field>

        <Field label="공간 주소 (영문, 하이픈만) *">
          <input name="slug" value={form.slug} onChange={handleChange} required
            placeholder="bukseong-books"
            className="w-full text-sm rounded-2xl px-4 py-3 outline-none font-mono" style={inputStyle} />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            접속 주소: /space/{form.slug || "..."}
          </p>
        </Field>

        <Field label="공간 유형 *">
          <select name="type" value={form.type} onChange={handleChange} required
            className="w-full text-sm rounded-2xl px-4 py-3 outline-none" style={inputStyle}>
            <option value="">선택해줘</option>
            {SPACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="위치 *">
          <input name="location" value={form.location} onChange={handleChange} required
            placeholder="서울 마포구"
            className="w-full text-sm rounded-2xl px-4 py-3 outline-none" style={inputStyle} />
        </Field>

        <Field label="공간 소개 *">
          <textarea name="description" value={form.description} onChange={handleChange} required
            placeholder="이 공간이 어떤 곳인지 소개해줘."
            rows={3} className="w-full text-sm rounded-2xl px-4 py-3 outline-none resize-none" style={inputStyle} />
        </Field>

        <Field label="공간 철학 *">
          <textarea name="philosophy" value={form.philosophy} onChange={handleChange} required
            placeholder="이 공간을 만든 이유, 담긴 철학을 적어줘."
            rows={3} className="w-full text-sm rounded-2xl px-4 py-3 outline-none resize-none" style={inputStyle} />
        </Field>

        <Field label="운영자 한마디 (선택)">
          <input name="ownerMessage" value={form.ownerMessage} onChange={handleChange}
            placeholder="방문자에게 전하고 싶은 말"
            className="w-full text-sm rounded-2xl px-4 py-3 outline-none" style={inputStyle} />
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || imageUploading}
          className="w-full py-3 rounded-full text-sm mt-2 disabled:opacity-30"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          {loading ? "저장 중..." : mode === "new" ? "공간 등록하기" : "수정 완료"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}
