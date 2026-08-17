"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePositionEditor, { type ImageTransform } from "@/components/ImagePositionEditor";
import ToggleSwitch from "@/components/ToggleSwitch";
import { EPISODE_SUMMARY_MAX, validateEpisodeSummary } from "@/lib/interviewInput";

interface EpisodeData {
  id: string;
  title: string;
  description: string;
  summary: string;
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
  const [summary, setSummary] = useState(episode.summary);
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

  const summaryValidation = validateEpisodeSummary(summary);

  // 파일럿 콘텐츠 제작 단순화 — 실제 제작에 쓰지 않는 입력을 숨긴다. summary/image state는 그대로
  // 두고 기존 값을 그대로 재저장하므로(변경 없음) DB 필드·기존 데이터는 전혀 손대지 않는다.
  // Scene 본문 끝의 따옴표 강조 문구(Scene.summary)와는 다른 필드다 — 그건 그대로 유지됨.
  // true로 바꾸면 즉시 원상복구.
  const SHOW_SUMMARY_INPUT = false;
  const SHOW_IMAGE_INPUT = false;

  async function save() {
    if (!summaryValidation.ok) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/episodes/${episode.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        summary: summary || null,
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

      {SHOW_SUMMARY_INPUT && (
        <div className="space-y-1.5">
          <p className={labelClass} style={labelStyle}>한 줄 요약 (선택)</p>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="완성된 공간처럼 보이지만, 사실은 아직도 매일 조금씩 배우고 있습니다."
            maxLength={EPISODE_SUMMARY_MAX}
            className={inputClass}
            style={inputStyle}
          />
          <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
            이야기의 핵심이나 계속 읽고 싶게 만드는 문장을 입력해주세요.
          </p>
          {!summaryValidation.ok && (
            <p className="text-xs" style={{ color: "#c0392b" }}>{summaryValidation.error}</p>
          )}
        </div>
      )}

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

      {SHOW_IMAGE_INPUT && (
        <ImagePositionEditor
          label="Episode 대표 이미지 (4:3, 선택)"
          value={image}
          onChange={setImage}
          aspectRatio="4/3"
        />
      )}

      <ToggleSwitch label={published ? "공개됨" : "비공개"} checked={published} onChange={setPublished} />

      <button
        onClick={save}
        disabled={saving || !title.trim() || !summaryValidation.ok}
        className="py-3 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : "에피소드 정보 저장"}
      </button>
    </section>
  );
}
