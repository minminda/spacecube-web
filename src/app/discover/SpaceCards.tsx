"use client";

import { useState } from "react";
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
  const [index, setIndex] = useState(0);

  if (spaces.length === 0) return null;

  const space = spaces[index];
  const total = spaces.length;

  return (
    <div className="space-y-4">
      {/* 카드 */}
      <div
        className="border cursor-pointer transition-colors hover:border-[var(--fg)]"
        style={{ borderColor: "var(--border)" }}
        onClick={() => router.push(`/space/${space.slug}`)}
      >
        {space.imageUrl && (
          <div className="relative w-full h-52 overflow-hidden">
            <Image
              src={space.imageUrl}
              alt={space.name}
              fill
              className="object-cover opacity-60"
            />
          </div>
        )}
        <div className="p-5 space-y-3">
          <p className="text-base">&gt; {space.name}</p>
          {space.tagline && (
            <p className="text-sm italic leading-relaxed" style={{ color: "var(--dim)" }}>
              &ldquo;{space.tagline}&rdquo;
            </p>
          )}
          <div className="flex gap-3 text-xs" style={{ color: "var(--dim)" }}>
            <span>[{space.type}]</span>
            {space.openingHours && <span>{space.openingHours}</span>}
          </div>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; 탭해서 더 보기 _
          </p>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--dim)" }}>
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="px-3 py-1 border transition-colors hover:border-[var(--fg)] disabled:opacity-20"
          style={{ borderColor: "var(--border)" }}
        >
          &lt; 이전
        </button>

        <span>{index + 1} / {total}</span>

        <button
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={index === total - 1}
          className="px-3 py-1 border transition-colors hover:border-[var(--fg)] disabled:opacity-20"
          style={{ borderColor: "var(--border)" }}
        >
          다음 &gt;
        </button>
      </div>
    </div>
  );
}
