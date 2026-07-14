"use client";

import Image from "next/image";

interface Props {
  ownerName?: string | null;
  ownerPhotoUrl?: string | null;
  ownerBio?: string | null;
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
