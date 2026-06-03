"use client";

import Image from "next/image";

interface Props {
  ownerName?: string | null;
  ownerPhotoUrl?: string | null;
  ownerBio?: string | null;
  ownerValues?: string | null;
  ownerPlaylistUrl?: string | null;
  ownerBlogUrl?: string | null;
  ownerSocialUrl?: string | null;
}

export default function OwnerStory({
  ownerName,
  ownerPhotoUrl,
  ownerBio,
  ownerValues,
  ownerPlaylistUrl,
  ownerBlogUrl,
  ownerSocialUrl,
}: Props) {
  const hasContent = ownerBio || ownerValues || ownerPlaylistUrl || ownerBlogUrl || ownerSocialUrl;

  if (!hasContent) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 운영자의 이야기가 준비되지 않았어요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(ownerPhotoUrl || ownerName) && (
        <div className="flex items-center gap-4">
          {ownerPhotoUrl && (
            <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
              <Image src={ownerPhotoUrl} alt={ownerName ?? ""} fill className="object-cover" />
            </div>
          )}
          {ownerName && <p className="text-base font-medium">{ownerName}</p>}
        </div>
      )}

      {ownerBio && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>운영자 이야기</p>
          <p className="text-sm leading-8 whitespace-pre-line">{ownerBio}</p>
        </div>
      )}

      {ownerValues && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>가장 중요하게 생각하는 가치</p>
          <div className="py-5 px-5" style={{ borderLeft: "2px solid var(--fg)" }}>
            <p className="text-sm leading-8 whitespace-pre-line">&ldquo;{ownerValues}&rdquo;</p>
          </div>
        </div>
      )}

      {(ownerPlaylistUrl || ownerBlogUrl || ownerSocialUrl) && (
        <div className="space-y-3">
          {ownerPlaylistUrl && (
            <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>플레이리스트</p>
              <a href={ownerPlaylistUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: "var(--dim)" }}>방문하기 ↗</a>
            </div>
          )}
          {ownerBlogUrl && (
            <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>블로그</p>
              <a href={ownerBlogUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: "var(--dim)" }}>방문하기 ↗</a>
            </div>
          )}
          {ownerSocialUrl && (
            <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>SNS</p>
              <a href={ownerSocialUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline" style={{ color: "var(--dim)" }}>방문하기 ↗</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
