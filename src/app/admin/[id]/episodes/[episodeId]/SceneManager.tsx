"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePositionEditor, { type ImageTransform } from "@/components/ImagePositionEditor";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { validateSceneFields } from "@/lib/sceneInput";

interface SceneData {
  id: string;
  title: string;
  content: string;
  summary: string;
  isActive: boolean;
  imageUrl: string;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  imageAspectRatio: "3/2" | "16/9";
  imageFit: "cover" | "contain";
}

export default function SceneManager({ episodeId, initialScenes }: { episodeId: string; initialScenes: SceneData[] }) {
  const router = useRouter();
  const [scenes, setScenes] = useState(initialScenes);
  const [creating, setCreating] = useState(false);
  const { toast, showToast } = useToast();

  async function addScene() {
    setCreating(true);
    const res = await fetch(`/api/episodes/${episodeId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });
    setCreating(false);
    if (!res.ok) {
      showToast("Scene 추가에 실패했어요.");
      return;
    }
    const created = await res.json();
    setScenes((prev) => [
      ...prev,
      {
        id: created.id,
        title: "",
        content: "",
        summary: "",
        isActive: true,
        imageUrl: "",
        imageZoom: 1,
        imagePositionX: 0.5,
        imagePositionY: 0.5,
        imageAspectRatio: "3/2",
        imageFit: "cover",
      },
    ]);
  }

  async function move(id: string, direction: "up" | "down") {
    const res = await fetch(`/api/scenes/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (res.ok) {
      setScenes((prev) => {
        const i = prev.findIndex((s) => s.id === id);
        const j = direction === "up" ? i - 1 : i + 1;
        if (i === -1 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
      router.refresh();
    } else {
      showToast("순서 변경에 실패했어요.");
    }
  }

  async function removeScene(id: string) {
    const res = await fetch(`/api/scenes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setScenes((prev) => prev.filter((s) => s.id !== id));
      showToast("Scene이 삭제되었습니다.");
    } else {
      showToast("삭제에 실패했어요.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          Scene ({scenes.length}개)
        </p>
        <button
          onClick={addScene}
          disabled={creating}
          className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          {creating ? "추가 중..." : "+ Scene 추가"}
        </button>
      </div>

      {scenes.length === 0 && (
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 Scene이 없어. 위 버튼으로 추가해봐.</p>
      )}

      <div className="space-y-4">
        {scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={i}
            total={scenes.length}
            onMove={(dir) => move(scene.id, dir)}
            onDelete={() => removeScene(scene.id)}
            onToast={showToast}
          />
        ))}
      </div>

      <Toast message={toast} />
    </section>
  );
}

function SceneCard({
  scene, index, total, onMove, onDelete, onToast,
}: {
  scene: SceneData;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onToast: (msg: string) => void;
}) {
  const [title, setTitle] = useState(scene.title);
  const [content, setContent] = useState(scene.content);
  const [summary, setSummary] = useState(scene.summary);
  const [isActive, setIsActive] = useState(scene.isActive);
  const [image, setImage] = useState<ImageTransform>({
    imageUrl: scene.imageUrl, zoom: scene.imageZoom, positionX: scene.imagePositionX, positionY: scene.imagePositionY,
  });
  const [aspectRatio, setAspectRatio] = useState<"3/2" | "16/9">(scene.imageAspectRatio);
  const [imageFit, setImageFit] = useState<"cover" | "contain">(scene.imageFit);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 사진을 새로 선택/교체/삭제하면(위치·확대 조절이 아니라 이미지 자체가 바뀌면) 이전 사진에 맞춰
  // 골랐던 "원본 전체 보기" 설정이 새 사진에 잘못 이어붙지 않도록 기본값(화면 채우기)으로 되돌린다.
  function handleImageChange(next: ImageTransform) {
    if (next.imageUrl !== image.imageUrl) setImageFit("cover");
    setImage(next);
  }

  const validation = validateSceneFields(title, content);

  async function save() {
    if (!validation.ok) return;
    setSaving(true);
    const res = await fetch(`/api/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        content,
        summary: summary || null,
        isActive,
        imageUrl: image.imageUrl || null,
        imageZoom: image.zoom,
        imagePositionX: image.positionX,
        imagePositionY: image.positionY,
        imageAspectRatio: aspectRatio,
        imageFit,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onToast("Scene이 저장되었습니다.");
    } else {
      onToast("저장에 실패했어요.");
    }
  }

  const inputClass = "w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]";
  const inputStyle = { borderColor: "var(--border)", color: "var(--fg)" };

  return (
    <div className="border p-4 space-y-4" style={{ borderColor: "var(--border)", opacity: isActive ? 1 : 0.5 }}>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--dim)" }}>Scene {index + 1}{!isActive && " · 비활성"}</span>
        <div className="flex gap-2 text-xs">
          <button onClick={() => onMove("up")} disabled={index === 0} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
          <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Scene 제목 (선택)"
        className={inputClass}
        style={inputStyle}
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Scene 본문"
        rows={4}
        className={inputClass}
        style={{ ...inputStyle, resize: "vertical" }}
      />

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--dim)" }}>한 줄 요약</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="예: 매출을 생각하면 없애야 했지만, 제가 가장 앉고 싶은 자리라서 남겼습니다."
          rows={2}
          className={inputClass}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
          Scene의 핵심을 한 문장으로 정리해 주세요. 방문자 화면에서 본문 아래 강조 문장으로 표시됩니다.
        </p>
      </div>

      <div className="space-y-2">
        {/* 사진 표현 방식 — 원본 비율(프레임 없이 사진 자체 크기·비율 그대로) vs 직접 Crop(비율을
            골라 위치/확대를 조절). Episode Scene 사진은 모두 같은 가로 카드로 강제하지 않는다. */}
        {image.imageUrl && (
          <div className="flex gap-2">
            {([
              { key: "contain", text: "원본 비율 사용" },
              { key: "cover", text: "직접 Crop" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setImageFit(opt.key)}
                className="text-xs px-2 py-1 border transition-colors"
                style={{
                  borderColor: imageFit === opt.key ? "var(--fg)" : "var(--border)",
                  background: imageFit === opt.key ? "var(--fg)" : "transparent",
                  color: imageFit === opt.key ? "var(--bg)" : "var(--dim)",
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>
        )}

        {imageFit === "cover" && (
          <div className="flex gap-2">
            {(["3/2", "16/9"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className="text-xs px-2 py-1 border transition-colors"
                style={{
                  borderColor: aspectRatio === ratio ? "var(--fg)" : "var(--border)",
                  background: aspectRatio === ratio ? "var(--fg)" : "transparent",
                  color: aspectRatio === ratio ? "var(--bg)" : "var(--dim)",
                }}
              >
                {ratio === "3/2" ? "3:2" : "16:9"}
              </button>
            ))}
          </div>
        )}

        <ImagePositionEditor value={image} onChange={handleImageChange} aspectRatio={aspectRatio} fit={imageFit} label="" />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          활성화 (해제 시 사용자 화면에서 숨김)
        </label>

        <div className="flex gap-2">
          {confirmDelete ? (
            <>
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>취소</button>
              <button onClick={onDelete} className="text-xs px-2 py-1 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">삭제 확인</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs px-2 py-1 border transition-colors hover:border-red-500 hover:text-red-500" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>삭제</button>
          )}
          <button
            onClick={save}
            disabled={saving || !validation.ok}
            className="text-xs px-3 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
            style={{ borderColor: "var(--fg)" }}
            title={!validation.ok ? validation.error : undefined}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {!validation.ok && (
        <p className="text-xs" style={{ color: "#c0392b" }}>{validation.error}</p>
      )}
    </div>
  );
}
