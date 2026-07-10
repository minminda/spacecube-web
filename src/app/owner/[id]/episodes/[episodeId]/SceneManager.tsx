"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePositionEditor, { type ImageTransform } from "@/components/ImagePositionEditor";

interface SceneData {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  imageUrl: string;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  imageAspectRatio: "3/2" | "16/9";
}

export default function SceneManager({ episodeId, initialScenes }: { episodeId: string; initialScenes: SceneData[] }) {
  const router = useRouter();
  const [scenes, setScenes] = useState(initialScenes);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

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
        isActive: true,
        imageUrl: "",
        imageZoom: 1,
        imagePositionX: 0.5,
        imagePositionY: 0.5,
        imageAspectRatio: "3/2",
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-sm border" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--fg)" }}>
          {toast}
        </div>
      )}
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
  const [isActive, setIsActive] = useState(scene.isActive);
  const [image, setImage] = useState<ImageTransform>({
    imageUrl: scene.imageUrl, zoom: scene.imageZoom, positionX: scene.imagePositionX, positionY: scene.imagePositionY,
  });
  const [aspectRatio, setAspectRatio] = useState<"3/2" | "16/9">(scene.imageAspectRatio);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        content,
        isActive,
        imageUrl: image.imageUrl || null,
        imageZoom: image.zoom,
        imagePositionX: image.positionX,
        imagePositionY: image.positionY,
        imageAspectRatio: aspectRatio,
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

      <div className="space-y-2">
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
        <ImagePositionEditor value={image} onChange={setImage} aspectRatio={aspectRatio} label="" />
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
            disabled={saving}
            className="text-xs px-3 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
            style={{ borderColor: "var(--fg)" }}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
