"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePositionEditor, { type ImageTransform } from "@/components/ImagePositionEditor";
import ToggleSwitch from "@/components/ToggleSwitch";

interface EpisodeData {
  id: string;
  title: string;
  description: string;
  unlockVisitCount: number;
  published: boolean;
  imageUrl: string;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
}

export default function EpisodeEditor({ episode }: { episode: EpisodeData }) {
  const router = useRouter();
  const [title, setTitle] = useState(episode.title);
  const [description, setDescription] = useState(episode.description);
  const [unlockVisitCount, setUnlockVisitCount] = useState(episode.unlockVisitCount);
  const [published, setPublished] = useState(episode.published);
  const [image, setImage] = useState<ImageTransform>({
    imageUrl: episode.imageUrl,
    zoom: episode.imageZoom,
    positionX: episode.imagePositionX,
    positionY: episode.imagePositionY,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/episodes/${episode.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        unlockVisitCount,
        published,
        imageUrl: image.imageUrl || null,
        imageZoom: image.zoom,
        imagePositionX: image.positionX,
        imagePositionY: image.positionY,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const inputClass = "w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]";
  const inputStyle = { borderColor: "var(--border)", color: "var(--fg)" };
  const labelClass = "text-xs uppercase tracking-widest";
  const labelStyle = { color: "var(--dim)" };

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>제목</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} style={inputStyle} />
      </div>

      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>소개문 (선택)</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="이 에피소드를 여는 짧은 소개 문장"
          className={inputClass}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>해금 방문 횟수</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            value={unlockVisitCount}
            onChange={(e) => setUnlockVisitCount(Math.max(0, Number(e.target.value)))}
            className="w-24 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
            style={inputStyle}
          />
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            {unlockVisitCount === 0 ? "0 = 방문 없이 항상 공개" : `이 공간을 ${unlockVisitCount}번째 방문할 때부터 열람 가능`}
          </p>
        </div>
      </div>

      <ImagePositionEditor
        label="Episode 대표 이미지 (4:3, 선택)"
        value={image}
        onChange={setImage}
        aspectRatio="4/3"
      />

      <ToggleSwitch label={published ? "공개됨" : "비공개"} checked={published} onChange={setPublished} />

      <button
        onClick={save}
        disabled={saving || !title.trim()}
        className="py-3 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : "에피소드 정보 저장"}
      </button>
    </section>
  );
}
