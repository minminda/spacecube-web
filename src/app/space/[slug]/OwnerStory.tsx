"use client";

import Image from "next/image";

interface Props {
  ownerName?: string | null;
  ownerPhotoUrl?: string | null;
  ownerBio?: string | null;
  // 아래 네 필드는 공간 페이지에서는 더 이상 쓰지 않는다(운영자 한마디로 축소).
  // 미사용 레거시 StoryTabs.tsx가 여전히 이 컴포넌트를 이 props로 호출하므로
  // 타입만 남겨 하위 호환을 유지한다.
  ownerValues?: string | null;
  ownerPlaylistUrl?: string | null;
  ownerBlogUrl?: string | null;
  ownerSocialUrl?: string | null;
}

export default function OwnerStory({ ownerName, ownerPhotoUrl, ownerBio }: Props) {
  if (!ownerBio) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm" style={{ color: "var(--dim)" }}>아직 운영자의 한마디가 준비되지 않았어요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(ownerPhotoUrl || ownerName) && (
        <div className="flex items-center gap-3">
          {ownerPhotoUrl && (
            <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              <Image src={ownerPhotoUrl} alt={ownerName ?? ""} fill className="object-cover" />
            </div>
          )}
          {ownerName && <p className="text-xs" style={{ color: "var(--dim)" }}>{ownerName}</p>}
        </div>
      )}
      <p className="text-base leading-relaxed line-clamp-3">&ldquo;{ownerBio}&rdquo;</p>
    </div>
  );
}
