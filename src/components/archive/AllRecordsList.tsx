"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { SpaceNoteCardData } from "./SpaceNoteCard";

/** 방문한 공간 전체를 검색하고, 고르면 공간 노트의 해당 페이지로 바로 이동한다. */
export default function AllRecordsList({ entries }: { entries: SpaceNoteCardData[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? entries.filter((e) =>
        e.spaceName.toLowerCase().includes(q) ||
        (e.district ?? "").toLowerCase().includes(q) ||
        e.spaceTypeLabel.toLowerCase().includes(q),
      )
    : entries;

  return (
    <div className="space-y-5">
      <input
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        placeholder="공간 이름, 지역으로 검색"
        className="w-full text-sm px-3 py-2.5 border bg-transparent outline-none"
        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
      />

      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>검색 결과가 없습니다</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <Link key={e.spaceId} href={`/archive?space=${e.spaceId}`} className="block space-y-1.5 group">
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3", background: "var(--tag-bg)" }}>
                {e.imageUrl && (
                  <Image
                    src={e.imageUrl}
                    alt={e.spaceName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 220px"
                  />
                )}
              </div>
              <p className="text-sm font-medium leading-snug group-hover:underline">{e.spaceName}</p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {[e.district, e.visitedAtLabel].filter(Boolean).join(" · ")}
              </p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                {e.visitCount}번 방문{e.tasteScore != null ? ` · ${e.tasteScore}/5` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
