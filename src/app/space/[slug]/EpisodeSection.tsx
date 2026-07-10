"use client";

import { useState } from "react";

interface SceneData {
  id: string;
  title: string | null;
  content: string;
  imageUrl: string | null;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  imageAspectRatio: string;
}

interface EpisodeData {
  id: string;
  episodeNumber: number;
  title: string;
  description: string | null;
  unlockVisitCount: number;
  unlocked: boolean;
  isRead: boolean;
  scenes: SceneData[];
}

export type BannerInfo =
  | { type: "new" | "unread"; count: number }
  | { type: "locked"; count: number }
  | null;

interface Props {
  episodes: EpisodeData[];
  banner: BannerInfo;
}

export default function EpisodeSection({ episodes, banner }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(episodes.filter((e) => e.isRead).map((e) => e.id)),
  );

  function toggle(ep: EpisodeData) {
    if (!ep.unlocked) return;
    const next = openId === ep.id ? null : ep.id;
    setOpenId(next);
    if (next && !readIds.has(ep.id)) {
      setReadIds((prev) => new Set(prev).add(ep.id));
      fetch(`/api/episodes/${ep.id}/read`, { method: "POST" }).catch(() => {});
    }
  }

  if (episodes.length === 0) return null;

  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>Episode</p>

      {banner && (
        <div
          className="px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: "var(--tag-bg)", color: "var(--dim)" }}
        >
          {banner.type === "new" && (
            <>
              이 공간엔 아직 못 보신 이야기가 있어요.
              <br />
              새로운 이야기 {banner.count}개가 열렸습니다.
            </>
          )}
          {banner.type === "unread" && "이 공간엔 아직 못 보신 이야기가 있어요."}
          {banner.type === "locked" && `이 공간에는 앞으로 만날 이야기 ${banner.count}개가 더 있어요.`}
        </div>
      )}

      <div className="space-y-2">
        {episodes.map((ep) => {
          const open = openId === ep.id;
          const read = readIds.has(ep.id);
          const remaining = ep.unlockVisitCount - (ep.unlocked ? 0 : 1); // 잠금 상태에서만 의미 있음

          return (
            <div key={ep.id} className="border" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => toggle(ep)}
                disabled={!ep.unlocked}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors disabled:cursor-default"
              >
                <span className="text-sm font-medium" style={{ color: ep.unlocked ? "var(--fg)" : "var(--dim)" }}>
                  EP.{ep.episodeNumber} {ep.unlocked ? ep.title : ""}
                </span>
                {ep.unlocked ? (
                  <span className="text-xs flex-shrink-0 ml-3" style={{ color: read ? "var(--dim)" : "var(--fg)" }}>
                    {read ? (open ? "닫기" : "열기") : "● 안읽음"}
                  </span>
                ) : (
                  <span className="text-xs flex-shrink-0 ml-3" style={{ color: "var(--border)" }}>🔒</span>
                )}
              </button>

              {!ep.unlocked && (
                <p className="px-4 pb-3 text-xs" style={{ color: "var(--dim)" }}>
                  {remaining <= 1 ? "다음 방문에서 열립니다." : `앞으로 ${remaining}번 더 방문하면 열립니다.`}
                </p>
              )}

              {ep.unlocked && open && (
                <div className="px-4 pb-4 space-y-5" style={{ borderTop: "1px solid var(--border)" }}>
                  {ep.description && (
                    <p className="text-xs leading-relaxed pt-4" style={{ color: "var(--dim)" }}>{ep.description}</p>
                  )}
                  {ep.scenes.map((scene) => (
                    <div key={scene.id} className="space-y-2">
                      {scene.imageUrl && (
                        <div
                          className="relative w-full overflow-hidden"
                          style={{ aspectRatio: scene.imageAspectRatio, borderColor: "var(--border)" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={scene.imageUrl}
                            alt={scene.title ?? ""}
                            className="w-full h-full object-cover"
                            style={{
                              objectPosition: `${scene.imagePositionX * 100}% ${scene.imagePositionY * 100}%`,
                              transform: `scale(${scene.imageZoom})`,
                              transformOrigin: "center center",
                            }}
                          />
                        </div>
                      )}
                      {scene.title && (
                        <p className="text-sm font-medium">{scene.title}</p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
                        {scene.content}
                      </p>
                    </div>
                  ))}
                  {ep.scenes.length === 0 && (
                    <p className="text-xs pt-4" style={{ color: "var(--border)" }}>아직 준비 중인 이야기예요.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
