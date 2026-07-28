"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

interface EpisodeRow {
  id: string;
  episodeNumber: number;
  title: string;
  unlockVisitCount: number;
  published: boolean;
  isFeatured: boolean;
  sceneCount: number;
}

interface Props {
  spaceId: string;
  initialEpisodes: EpisodeRow[];
}

export default function EpisodeList({ spaceId, initialEpisodes }: Props) {
  const router = useRouter();
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  async function createEpisode() {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    const res = await fetch(`/api/spaces/${spaceId}/episodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "생성에 실패했어요.");
      return;
    }
    setNewTitle("");
    router.refresh();
    const created = await res.json();
    setEpisodes((prev) => [
      ...prev,
      { id: created.id, episodeNumber: created.episodeNumber, title: created.title, unlockVisitCount: created.unlockVisitCount, published: created.published, isFeatured: false, sceneCount: 0 },
    ]);
  }

  async function togglePublished(ep: EpisodeRow) {
    setBusyId(ep.id);
    const res = await fetch(`/api/episodes/${ep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !ep.published }),
    });
    setBusyId(null);
    if (res.ok) {
      setEpisodes((prev) => prev.map((e) => (e.id === ep.id ? { ...e, published: !e.published } : e)));
    } else {
      showToast("변경에 실패했어요.");
    }
  }

  /** 대표 이야기 지정/해제 — 공간당 최대 1개라 지정 시 다른 행의 배지도 함께 내려간다. */
  async function toggleFeatured(ep: EpisodeRow) {
    const nextFeatured = !ep.isFeatured;
    setBusyId(ep.id);
    const res = await fetch(`/api/episodes/${ep.id}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: nextFeatured }),
    });
    setBusyId(null);
    if (res.ok) {
      setEpisodes((prev) => prev.map((e) => ({ ...e, isFeatured: e.id === ep.id ? nextFeatured : nextFeatured ? false : e.isFeatured })));
    } else {
      showToast("변경에 실패했어요.");
    }
  }

  async function move(id: string, direction: "up" | "down") {
    setBusyId(id);
    const res = await fetch(`/api/episodes/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setBusyId(null);
    if (res.ok) {
      router.refresh();
      const i = episodes.findIndex((e) => e.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i !== -1 && j >= 0 && j < episodes.length) {
        const next = [...episodes];
        [next[i], next[j]] = [next[j], next[i]];
        setEpisodes(next.map((e, idx) => ({ ...e, episodeNumber: idx + 1 })));
      }
    } else {
      showToast("순서 변경에 실패했어요.");
    }
  }

  async function deleteEpisode(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/episodes/${id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmDeleteId(null);
    if (res.ok) {
      setEpisodes((prev) => prev.filter((e) => e.id !== id).map((e, i) => ({ ...e, episodeNumber: i + 1 })));
      showToast("에피소드가 삭제되었습니다.");
    } else {
      showToast("삭제에 실패했어요.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 새 에피소드 추가 */}
      <div className="flex gap-3">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="새 에피소드 제목 (예: 첫 방문의 기록)"
          className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          onKeyDown={(e) => { if (e.key === "Enter") createEpisode(); }}
        />
        <button
          onClick={createEpisode}
          disabled={creating || !newTitle.trim()}
          className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {creating ? "추가 중..." : "+ 추가"}
        </button>
      </div>

      {episodes.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>&gt; 등록된 에피소드가 없어.</p>
      ) : (
        <div className="space-y-3">
          {episodes.map((ep, i) => (
            <div key={ep.id} className="p-4 border space-y-3" style={{ borderColor: "var(--border)", opacity: ep.published ? 1 : 0.55 }}>
              <div className="flex justify-between items-start">
                <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
                  <p style={{ color: "var(--fg)" }}>
                    &gt; EP.{ep.episodeNumber} {ep.title}
                    {ep.isFeatured && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 border" style={{ borderColor: "var(--fg)", color: "var(--fg)" }}>
                        대표 이야기
                      </span>
                    )}
                  </p>
                  <p>해금 방문 횟수 : {ep.unlockVisitCount === 0 ? "항상 공개" : `${ep.unlockVisitCount}회 이상`}</p>
                  <p>Scene : {ep.sceneCount}개</p>
                </div>
                <span className="text-xs px-1.5 py-0.5 border flex-shrink-0" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                  {ep.published ? "공개" : "비공개"}
                </span>
              </div>
              {ep.isFeatured && ep.unlockVisitCount > 0 && (
                <p className="text-xs" style={{ color: "var(--border)" }}>
                  ⚠ QR 스캔 시 첫 방문자도 바로 이 이야기로 들어옵니다 — 해금 방문 횟수를 0으로 두는 것을 권장해요.
                </p>
              )}
              <div className="flex gap-2 text-xs flex-wrap items-center">
                <button
                  onClick={() => move(ep.id, "up")}
                  disabled={i === 0 || busyId === ep.id}
                  className="border px-2 py-1 transition-colors disabled:opacity-30"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >▲</button>
                <button
                  onClick={() => move(ep.id, "down")}
                  disabled={i === episodes.length - 1 || busyId === ep.id}
                  className="border px-2 py-1 transition-colors disabled:opacity-30"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >▼</button>
                <Link
                  href={`/admin/${spaceId}/episodes/${ep.id}`}
                  className="border px-3 py-1 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [수정 / Scene 관리]
                </Link>
                <button
                  onClick={() => togglePublished(ep)}
                  disabled={busyId === ep.id}
                  className="border px-3 py-1 transition-colors disabled:opacity-40"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {ep.published ? "[비공개로]" : "[공개로]"}
                </button>
                <button
                  onClick={() => toggleFeatured(ep)}
                  disabled={busyId === ep.id}
                  className="border px-3 py-1 transition-colors disabled:opacity-40"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {ep.isFeatured ? "[대표 해제]" : "[대표로 설정]"}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(ep.id)}
                  className="border px-3 py-1 transition-colors hover:border-red-500 hover:text-red-500"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  [삭제]
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}
        >
          <div className="w-full max-w-sm p-6 space-y-5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold">이 에피소드를 삭제하시겠습니까?</p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>포함된 모든 Scene과 사용자 열람 기록이 함께 삭제됩니다. 되돌릴 수 없습니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 text-sm border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>취소</button>
              <button onClick={() => deleteEpisode(confirmDeleteId)} className="flex-1 py-2 text-sm border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
