import Link from "next/link";

interface EpisodeSummary {
  id: string;
  episodeNumber: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  unlockVisitCount: number;
  unlocked: boolean;
  isRead: boolean;
  /** 아직 관리자가 만들지 않은, "다음에 올" 이야기 자리 — 재방문 동기를 위한 예고 카드 */
  isPlaceholder?: boolean;
}

export type BannerInfo =
  | { type: "new" | "unread"; count: number }
  | { type: "locked"; count: number }
  | null;

interface Props {
  spaceSlug: string;
  episodes: EpisodeSummary[];
  banner: BannerInfo;
}

export default function EpisodeSection({ spaceSlug, episodes, banner }: Props) {
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
          if (ep.isPlaceholder) {
            return (
              <div
                key={ep.id}
                className="border border-dashed px-4 py-3 flex items-center gap-3"
                style={{ borderColor: "var(--border)", opacity: 0.55 }}
              >
                <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>🔒</span>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <span className="text-sm font-medium" style={{ color: "var(--dim)" }}>
                    EP.{ep.episodeNumber}
                  </span>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>다음 이야기가 준비되고 있어요. (예정)</p>
                </div>
              </div>
            );
          }

          const remaining = ep.unlockVisitCount - (ep.unlocked ? 0 : 1);
          const body = (
            <div className="flex gap-3 items-center px-4 py-3">
              {ep.unlocked && ep.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ep.imageUrl} alt="" className="w-14 h-14 object-cover flex-shrink-0" />
              )}
              {!ep.unlocked && (
                <span className="text-sm flex-shrink-0" aria-hidden>🔒</span>
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: ep.unlocked ? "var(--fg)" : "var(--dim)" }}>
                    EP.{ep.episodeNumber} {ep.unlocked ? ep.title : ""}
                  </span>
                  {ep.unlocked && (
                    <span className="text-xs flex-shrink-0" style={{ color: ep.isRead ? "var(--dim)" : "var(--fg)" }}>
                      {ep.isRead ? "읽기 →" : "● 안읽음"}
                    </span>
                  )}
                </div>
                {ep.unlocked && ep.description && (
                  <p className="text-xs truncate" style={{ color: "var(--dim)" }}>{ep.description}</p>
                )}
                {!ep.unlocked && (
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    {remaining <= 1 ? "다음 방문에서 열립니다." : `앞으로 ${remaining}번 더 방문하면 열립니다.`}
                  </p>
                )}
              </div>
            </div>
          );

          if (ep.unlocked) {
            return (
              <div key={ep.id} className="border" style={{ borderColor: "var(--border)" }}>
                <Link href={`/space/${spaceSlug}/episodes/${ep.id}`} className="block transition-colors hover:bg-[var(--tag-bg)]">
                  {body}
                </Link>
              </div>
            );
          }

          return (
            <div
              key={ep.id}
              className="border cursor-not-allowed transition-opacity opacity-[0.45] hover:opacity-[0.7]"
              style={{ borderColor: "var(--border)" }}
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
