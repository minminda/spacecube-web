"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageCropDialog, { type AspectOption } from "@/components/ImageCropDialog";
import { loadImage } from "@/lib/imageCrop";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { validateSceneFields } from "@/lib/sceneInput";

/* Scene 사진은 파일을 고른 직후(업로드 전) ImageCropDialog로 실제 잘라낼 영역을 정하고,
   잘린 결과만 업로드한다 — 예전의 "업로드 후 프레임 안에서 드래그/확대" 방식은 더 이상
   쓰지 않는다(중복 편집 UX 방지). 자유/3:2/16:9 중 무엇으로 잘랐든 결과는 항상 그 사진
   자체의 비율로 자연스럽게 표시된다 — 3:2/16:9는 crop box의 비율을 고정할 뿐 표시
   방식을 바꾸지 않는다. Scene당 최대 3장까지 등록 가능(에디토리얼 배치는 방문자
   화면의 src/lib/sceneImageLayout.ts가 담당). */
const SCENE_ASPECT_OPTIONS: AspectOption[] = [
  { label: "자유", value: null },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

const MAX_IMAGES = 3;

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

interface SceneImageData {
  imageUrl: string;
  width: number;
  height: number;
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
  images: SceneImageData[];
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
        images: [],
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
  // 다중 이미지 목록 — scene.images(신규 구조)가 있으면 그대로, 없고 레거시 단일 이미지만
  // 있으면 그 사진을 "이미지 1"로 취급한다(width/height=0은 "아직 크기 미확인" 표시 —
  // 저장 시점에 로드해서 확보한다). 기존 데이터를 삭제/재등록하게 만들지 않기 위함.
  const [images, setImages] = useState<SceneImageData[]>(() => {
    if (scene.images.length > 0) return scene.images;
    if (scene.imageUrl) return [{ imageUrl: scene.imageUrl, width: 0, height: 0 }];
    return [];
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null); // null=추가, 숫자=그 인덱스 교체
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const validation = validateSceneFields(title, content);

  function handleAddFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setReplaceIndex(null); setPendingFile(file); }
    e.target.value = "";
  }

  function handleReplaceFileChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setReplaceIndex(idx); setPendingFile(file); }
    e.target.value = "";
  }

  async function handleCropConfirm(croppedFile: File, width: number, height: number) {
    setPendingFile(null);
    setUploading(true);
    const url = await uploadToCloudinary(croppedFile);
    setUploading(false);
    if (!url) {
      onToast("이미지 업로드에 실패했어요. 다시 시도해주세요.");
      return;
    }
    setImages((prev) => {
      if (replaceIndex !== null) {
        const next = [...prev];
        next[replaceIndex] = { imageUrl: url, width, height };
        return next;
      }
      return prev.length < MAX_IMAGES ? [...prev, { imageUrl: url, width, height }] : prev;
    });
    setReplaceIndex(null);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveImage(idx: number, direction: "up" | "down") {
    setImages((prev) => {
      const j = direction === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function save() {
    if (!validation.ok) return;
    setSaving(true);

    // 레거시 단일 이미지를 승격했지만 아직 크기를 모르는 항목(width/height=0)이 있으면
    // 저장 직전에 로드해서 확보한다 — 실패하면 저장을 중단해 데이터가 조용히 유실되지
    // 않게 한다(기존 사진은 레거시 필드에 그대로 남아있으니 재시도해도 안전).
    let resolvedImages: SceneImageData[];
    try {
      resolvedImages = await Promise.all(
        images.map(async (img) => {
          if (img.width > 0 && img.height > 0) return img;
          const el = await loadImage(img.imageUrl);
          return { imageUrl: img.imageUrl, width: el.naturalWidth, height: el.naturalHeight };
        }),
      );
    } catch {
      setSaving(false);
      onToast("이미지 정보를 확인하지 못했어요. 다시 시도해주세요.");
      return;
    }

    const res = await fetch(`/api/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        content,
        summary: summary || null,
        isActive,
        images: resolvedImages,
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

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
          사진{images.length > 0 && ` (${images.length}/${MAX_IMAGES})`}
        </p>

        {images.map((img, i) => (
          <div key={i} className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt=""
              className="block border flex-shrink-0"
              style={{ borderColor: "var(--border)", maxWidth: "45%", maxHeight: "140px", width: "auto", height: "auto" }}
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                <button onClick={() => moveImage(i, "up")} disabled={i === 0} className="text-xs border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
                <button onClick={() => moveImage(i, "down")} disabled={i === images.length - 1} className="text-xs border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
              </div>
              <label className="text-xs py-1.5 px-2.5 text-center border cursor-pointer transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                교체
                <input type="file" accept="image/*" onChange={(e) => handleReplaceFileChange(i, e)} disabled={uploading} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="text-xs py-1.5 px-2.5 border transition-colors hover:border-red-500 hover:text-red-500"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_IMAGES ? (
          <label className="inline-block text-xs py-2 px-3 text-center border cursor-pointer transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            {uploading ? "업로드 중..." : "+ 사진 추가"}
            <input type="file" accept="image/*" onChange={handleAddFileChange} disabled={uploading} className="hidden" />
          </label>
        ) : (
          <p className="text-xs" style={{ color: "var(--border)" }}>최대 {MAX_IMAGES}장까지 등록할 수 있어요.</p>
        )}
      </div>

      {pendingFile && (
        <ImageCropDialog
          file={pendingFile}
          aspectOptions={SCENE_ASPECT_OPTIONS}
          onConfirm={handleCropConfirm}
          onCancel={() => { setPendingFile(null); setReplaceIndex(null); }}
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
