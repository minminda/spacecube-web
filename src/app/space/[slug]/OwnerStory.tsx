"use client";

import Image from "next/image";
import type { Lang } from "@/lib/i18n";

interface Props {
  ownerName?: string | null;
  ownerPhotoUrl?: string | null;
  ownerBio?: string | null;
  ownerValues?: string | null;
  ownerPlaylistUrl?: string | null;
  ownerBlogUrl?: string | null;
  ownerSocialUrl?: string | null;
  lang: Lang;
}

export default function OwnerStory({
  ownerName,
  ownerPhotoUrl,
  ownerBio,
  ownerValues,
  ownerPlaylistUrl,
  ownerBlogUrl,
  ownerSocialUrl,
  lang,
}: Props) {
  const t = {
    story:    lang === "ko" ? "운영자 이야기" : lang === "ja" ? "オーナーの話" : lang === "zh" ? "老板的故事" : "Owner's Story",
    values:   lang === "ko" ? "가장 중요하게 생각하는 가치" : lang === "ja" ? "大切にしていること" : lang === "zh" ? "最重视的价值" : "Core Values",
    playlist: lang === "ko" ? "플레이리스트" : lang === "ja" ? "プレイリスト" : lang === "zh" ? "播放列表" : "Playlist",
    blog:     lang === "ko" ? "블로그" : lang === "ja" ? "ブログ" : lang === "zh" ? "博客" : "Blog",
    social:   lang === "ko" ? "SNS" : "SNS",
    visit:    lang === "ko" ? "방문하기 ↗" : lang === "ja" ? "見る ↗" : lang === "zh" ? "访问 ↗" : "Visit ↗",
    noStory:  lang === "ko" ? "아직 운영자의 이야기가 준비되지 않았어요." : lang === "ja" ? "オーナーのストーリーはまだ準備中です。" : lang === "zh" ? "老板的故事还没有准备好。" : "The owner's story isn't ready yet.",
  };

  const hasContent = ownerBio || ownerValues || ownerPlaylistUrl || ownerBlogUrl || ownerSocialUrl;

  if (!hasContent) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm" style={{ color: "var(--dim)" }}>{t.noStory}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 운영자 프로필 */}
      {(ownerPhotoUrl || ownerName) && (
        <div className="flex items-center gap-4">
          {ownerPhotoUrl && (
            <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
              <Image src={ownerPhotoUrl} alt={ownerName ?? ""} fill className="object-cover" />
            </div>
          )}
          {ownerName && (
            <p className="text-base font-medium">{ownerName}</p>
          )}
        </div>
      )}

      {/* 운영자 이야기 */}
      {ownerBio && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.story}</p>
          <p className="text-sm leading-8 whitespace-pre-line">{ownerBio}</p>
        </div>
      )}

      {/* 가장 중요하게 생각하는 가치 */}
      {ownerValues && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.values}</p>
          <div className="py-5 px-5" style={{ borderLeft: "2px solid var(--fg)" }}>
            <p className="text-sm leading-8 whitespace-pre-line">&ldquo;{ownerValues}&rdquo;</p>
          </div>
        </div>
      )}

      {/* 링크 섹션 */}
      {(ownerPlaylistUrl || ownerBlogUrl || ownerSocialUrl) && (
        <div className="space-y-3">
          {ownerPlaylistUrl && (
            <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.playlist}</p>
              <a href={ownerPlaylistUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: "var(--dim)" }}>{t.visit}</a>
            </div>
          )}
          {ownerBlogUrl && (
            <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.blog}</p>
              <a href={ownerBlogUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: "var(--dim)" }}>{t.visit}</a>
            </div>
          )}
          {ownerSocialUrl && (
            <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{t.social}</p>
              <a href={ownerSocialUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: "var(--dim)" }}>{t.visit}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
