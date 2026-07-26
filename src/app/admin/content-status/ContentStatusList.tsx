"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

interface EpisodeRow {
  id: string;
  episodeNumber: number;
  title: string;
  published: boolean;
}

interface SpaceRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  episodes: EpisodeRow[];
}

export default function ContentStatusList({ spaces }: { spaces: SpaceRow[] }) {
  const [rows, setRows] = useState(spaces);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  async function toggleSpace(spaceId: string, isActive: boolean) {
    setBusy(spaceId);
    const res = await fetch(`/api/spaces/${spaceId}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setBusy(null);
    if (res.ok) {
      setRows((prev) => prev.map((s) => (s.id === spaceId ? { ...s, isActive: !isActive } : s)));
    } else {
      showToast("변경에 실패했어요.");
    }
  }

  async function toggleEpisode(spaceId: string, episodeId: string, published: boolean) {
    setBusy(episodeId);
    const res = await fetch(`/api/episodes/${episodeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    setBusy(null);
    if (res.ok) {
      setRows((prev) =>
        prev.map((s) =>
          s.id === spaceId
            ? { ...s, episodes: s.episodes.map((e) => (e.id === episodeId ? { ...e, published: !published } : e)) }
            : s
        )
      );
    } else {
      showToast("변경에 실패했어요.");
    }
  }

  return (
    <div className="space-y-4">
      {rows.map((space) => (
        <div key={space.id} className="p-4 border space-y-3" style={{ borderColor: "var(--border)", opacity: space.isActive ? 1 : 0.55 }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold">{space.name}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-1.5 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                공간 {space.isActive ? "공개" : "비공개"}
              </span>
              <button
                onClick={() => toggleSpace(space.id, space.isActive)}
                disabled={busy === space.id}
                className="border px-2 py-1 transition-colors disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {space.isActive ? "비공개로" : "공개로"}
              </button>
              <Link href={`/admin/${space.id}/episodes`} className="border px-2 py-1" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                에피소드 관리 →
              </Link>
            </div>
          </div>

          {space.episodes.length > 0 && (
            <div className="pl-3 space-y-1.5" style={{ borderLeft: "2px solid var(--border)" }}>
              {space.episodes.map((ep) => (
                <div key={ep.id} className="flex items-center justify-between text-xs gap-2">
                  <span style={{ color: "var(--dim)" }}>EP.{ep.episodeNumber} {ep.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-1.5 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                      {ep.published ? "공개" : "비공개"}
                    </span>
                    <button
                      onClick={() => toggleEpisode(space.id, ep.id, ep.published)}
                      disabled={busy === ep.id}
                      className="border px-2 py-0.5 transition-colors disabled:opacity-40"
                      style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                    >
                      {ep.published ? "비공개로" : "공개로"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Toast message={toast} />
    </div>
  );
}
