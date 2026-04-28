"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

interface SpaceCard {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  type: string;
  openingHours: string | null;
  imageUrl: string | null;
}

export default function SpaceCards({ spaces }: { spaces: SpaceCard[] }) {
  const router = useRouter();

  if (spaces.length === 0) return null;

  return (
    <div className="space-y-8 pb-8">
      {spaces.map((space) => (
        <div
          key={space.id}
          className="cursor-pointer group"
          onClick={() => router.push(`/space/${space.slug}`)}
        >
          {space.imageUrl && (
            <div
              className="relative w-full overflow-hidden mb-4"
              style={{ aspectRatio: "16 / 10" }}
            >
              <Image
                src={space.imageUrl}
                alt={space.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-base font-semibold leading-snug">{space.name}</p>
            {space.tagline && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                {space.tagline}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--dim)" }}>
              <span>{space.type}</span>
              {space.openingHours && (
                <>
                  <span>·</span>
                  <span>{space.openingHours}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
