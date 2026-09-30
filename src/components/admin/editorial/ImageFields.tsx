"use client";

import { useState } from "react";
import ImageCropDialog, { type AspectOption } from "@/components/ImageCropDialog";
import { uploadEditorialImage, type UploadedImage } from "@/lib/uploadImage";
import { adminButtonClass } from "@/components/admin/ui";

/* ── Editorial CMS 이미지 입력 ─────────────────────────────────────────────
   파일 선택 → (단일 이미지는) ImageCropDialog로 자르기 → Cloudinary 업로드 → URL 저장.
   미디어 라이브러리 없이 콘텐츠마다 바로 올린다(초기 버전 범위). ── */

const FREE_ASPECTS: AspectOption[] = [
  { label: "자유", value: null },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

function Thumb({ url, ratio = "4 / 3" }: { url: string; ratio?: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border" style={{ borderColor: "var(--a-line)", aspectRatio: ratio, background: "var(--a-soft)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
}

interface SingleProps {
  value: string | null;
  onChange: (url: string | null, meta?: UploadedImage) => void;
  aspectOptions?: AspectOption[];
  thumbRatio?: string;
}

/** 이미지 한 장(대표 이미지·본문 이미지). */
export function ImageField({ value, onChange, aspectOptions = FREE_ASPECTS, thumbRatio }: SingleProps) {
  const [pending, setPending] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setPending(null);
    setUploading(true);
    setError(null);
    try {
      const up = await uploadEditorialImage(file);
      onChange(up.url, up);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value && <div className="max-w-sm"><Thumb url={value} ratio={thumbRatio} /></div>}
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${adminButtonClass("secondary", "sm")} cursor-pointer`}>
          {uploading ? "업로드 중..." : value ? "이미지 교체" : "이미지 선택"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPending(f);
              e.target.value = "";
            }}
          />
        </label>
        {value && !uploading && (
          <button type="button" onClick={() => onChange(null)} className={adminButtonClass("ghost", "sm")}>
            삭제
          </button>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: "var(--a-danger)" }}>{error}</p>}
      {pending && (
        <ImageCropDialog file={pending} aspectOptions={aspectOptions} onConfirm={(f) => upload(f)} onCancel={() => setPending(null)} />
      )}
    </div>
  );
}

/** 사진 여러 장(공간 사진) — 자르기 없이 바로 올리고, ↑↓·삭제로 정리한다. */
export function ImageListField({ value, onChange, max = 20 }: { value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: File[]) {
    const room = Math.max(0, max - value.length);
    const list = files.slice(0, room);
    if (list.length === 0) return;
    setError(null);
    setUploading(list.length);
    const urls: string[] = [];
    for (const f of list) {
      try {
        urls.push((await uploadEditorialImage(f)).url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "일부 사진 업로드에 실패했어요.");
      }
      setUploading((n) => n - 1);
    }
    onChange([...value, ...urls]);
  }

  function move(i: number, d: -1 | 1) {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {value.map((url, i) => (
            <li key={`${url}-${i}`} className="space-y-1.5">
              <Thumb url={url} ratio="1 / 1" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] tabular-nums" style={{ color: "var(--a-dim)" }}>{i + 1}</span>
                <span className="flex gap-0.5">
                  <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, -1)} disabled={i === 0} aria-label="앞으로">↑</button>
                  <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="뒤로">↓</button>
                  <button type="button" className={adminButtonClass("ghost", "sm")} onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="삭제">✕</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <label className={`${adminButtonClass("secondary", "sm")} cursor-pointer ${value.length >= max ? "opacity-40 pointer-events-none" : ""}`}>
        {uploading > 0 ? `업로드 중... (${uploading})` : "+ 사진 추가"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading > 0}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            addFiles(files);
          }}
        />
      </label>
      {error && <p className="text-xs" style={{ color: "var(--a-danger)" }}>{error}</p>}
    </div>
  );
}
