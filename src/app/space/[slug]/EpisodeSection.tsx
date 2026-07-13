import Link from "next/link";

interface EpisodeSummary {
  id: string;
  episodeNumber: number;
  title: string;
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

      <div className="space-y-1.5">
        {episodes.map((ep) => {
          if (ep.isPlaceholder) {
            return (
              <div
                key={ep.id}
                className="flex items-center gap-2.5 px-4 py-3 border border-dashed"
                style={{ borderColor: "var(--border)", opacity: 0.5 }}
              >
                <span className="text-xs" style={{ color: "var(--dim)" }}>EP.{ep.episodeNumber}</span>
                <span className="text-sm" style={{ color: "var(--dim)" }}>다음 이야기 (예정)</span>
              </div>
            );
          }

          const body = (
            <div className="flex items-center gap-2.5 px-4 py-3.5">
              <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>EP.{ep.episodeNumber}</span>
              <span className="text-sm flex-1 min-w-0 truncate" style={{ color: ep.unlocked ? "var(--fg)" : "var(--dim)" }}>
                {ep.title}
              </span>
              {!ep.unlocked && <span className="text-xs flex-shrink-0" aria-hidden>🔒</span>}
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
