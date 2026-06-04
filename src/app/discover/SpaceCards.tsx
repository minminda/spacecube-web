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

interface Props {
  spaces: SpaceCard[];
  /** 방문함 배지를 표시할 공간 ID 목록 */
  visitedSpaceIds?: string[];
}

export default function SpaceCards({ spaces, visitedSpaceIds = [] }: Props) {
  const router = useRouter();
  const visitedSet = new Set(visitedSpaceIds);

  if (spaces.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10 pb-8">
      {spaces.map((space) => {
        const isVisited = visitedSet.has(space.id);
        return (
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
              <div className="flex items-start gap-2">
                <p className="text-base font-semibold leading-snug flex-1">{space.name}</p>
                {isVisited && (
                  <span
                    className="text-xs flex-shrink-0 px-1.5 py-0.5 border mt-0.5"
                    style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                  >
                    방문함
                  </span>
                )}
              </div>
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
        );
      })}
    </div>
  );
}
