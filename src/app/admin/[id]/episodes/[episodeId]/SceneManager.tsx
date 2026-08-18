"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageCropDialog, { type AspectOption } from "@/components/ImageCropDialog";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { validateSceneFields } from "@/lib/sceneInput";

/* Scene 사진은 파일을 고른 직후(업로드 전) ImageCropDialog로 실제 잘라낼 영역을 정하고,
   잘린 결과만 업로드한다 — 예전의 "업로드 후 프레임 안에서 드래그/확대" 방식은 더 이상
   쓰지 않는다(중복 편집 UX 방지). 자유/3:2/16:9 중 무엇으로 잘랐든 결과는 항상 그 사진
   자체의 비율로 자연스럽게 표시된다(imageFit="contain", 기존 렌더링 경로 그대로 재사용) —
   3:2/16:9는 crop box의 비율을 고정할 뿐 표시 방식을 바꾸지 않는다. */
const SCENE_ASPECT_OPTIONS: AspectOption[] = [
  { label: "자유", value: null },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

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

interface SceneImageState {
  imageUrl: string;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  imageFit: "cover" | "contain";
}

const EMPTY_IMAGE: SceneImageState = { imageUrl: "", imageZoom: 1, imagePositionX: 0.5, imagePositionY: 0.5, imageFit: "cover" };

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
  const [image, setImage] = useState<SceneImageState>({
    imageUrl: scene.imageUrl, imageZoom: scene.imageZoom, imagePositionX: scene.imagePositionX, imagePositionY: scene.imagePositionY, imageFit: scene.imageFit,
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const validation = validateSceneFields(title, content);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  }

  async function handleCropConfirm(croppedFile: File) {
    setPendingFile(null);
    setUploading(true);
    const url = await uploadToCloudinary(croppedFile);
    setUploading(false);
    if (!url) {
      onToast("이미지 업로드에 실패했어요. 다시 시도해주세요.");
      return;
    }
    // 잘린 결과 자체가 최종 이미지라 위치/확대는 더 이상 의미가 없다 — 기본값으로 두고
    // "원본 비율 사용"(contain, 프레임 없이 사진 자체 크기로 표시)으로 저장한다.
    setImage({ imageUrl: url, imageZoom: 1, imagePositionX: 0.5, imagePositionY: 0.5, imageFit: "contain" });
  }

  function handleRemoveImage() {
    setImage(EMPTY_IMAGE);
  }

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
        imageZoom: image.imageZoom,
        imagePositionX: image.imagePositionX,
        imagePositionY: image.imagePositionY,
        imageFit: image.imageFit,
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
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>사진</p>
        {image.imageUrl && (
          // 방문자 화면과 동일한 기준(자연 크기, 최대 220px 높이)으로 미리보기 — 실제 잘린
          // 결과를 그대로 보여준다(별도 프레임/배경 없음).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.imageUrl}
            alt=""
            className="block border"
            style={{ borderColor: "var(--border)", maxWidth: "100%", maxHeight: "220px", width: "auto", height: "auto" }}
          />
        )}
        <div className="flex gap-3">
          <label className="text-xs py-2 px-3 text-center border cursor-pointer transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            {uploading ? "업로드 중..." : image.imageUrl ? "이미지 교체" : "사진 선택"}
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
          </label>
          {image.imageUrl && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="text-xs px-3 py-2 border transition-colors hover:border-red-500 hover:text-red-500"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {pendingFile && (
        <ImageCropDialog
          file={pendingFile}
          aspectOptions={SCENE_ASPECT_OPTIONS}
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingFile(null)}
        />
      )}

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
