import Link from "next/link";
import Image from "next/image";
import { formatDotDate } from "@/lib/time";
import { guestbookNoteHref, type SpaceNoteEntry } from "@/lib/archiveSpaceNotes";

/* ── 공간 노트 카드 — 방문한 공간 하나를 노트 한 장으로 ─────────────────────
   서버에서 만든 SpaceNoteEntry(Date 포함)를 클라이언트로 넘기기 전에 여기서
   문자열로 직렬화한다(VisitedRow 등 기존 DTO들과 같은 관례 — Date를 그대로
   클라이언트 prop으로 넘기지 않는다). ── */

export interface SpaceNoteCardData {
  spaceId: string;
  spaceSlug: string;
  spaceName: string;
  spaceTypeLabel: string;
  district: string | null;
  imageUrl: string | null;
  visitedAtLabel: string;
  tasteScore: number | null;
  visitCount: number;
  coreTags: string[];
  guestbookNote: null | { content: string; href: string; color: string };
}

export function toSpaceNoteCardData(entry: SpaceNoteEntry): SpaceNoteCardData {
  return {
    spaceId: entry.spaceId,
    spaceSlug: entry.spaceSlug,
    spaceName: entry.spaceName,
    spaceTypeLabel: entry.spaceTypeLabel,
    district: entry.district,
    imageUrl: entry.imageUrl,
    visitedAtLabel: formatDotDate(entry.visitedAt),
    tasteScore: entry.tasteScore,
    visitCount: entry.visitCount,
    coreTags: entry.coreTags,
    guestbookNote: entry.latestGuestbookNote && {
      content: entry.latestGuestbookNote.content,
      color: entry.latestGuestbookNote.color,
      href: guestbookNoteHref(entry.latestGuestbookNote),
    },
  };
}

export default function SpaceNoteCard({ data }: { data: SpaceNoteCardData }) {
  return (
    <div
      className="flex flex-col h-full overflow-y-auto p-5 gap-4"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div className="space-y-0.5">
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          {data.visitedAtLabel}
          {data.district && ` · ${data.district}`}
        </p>
      </div>

      <div className="space-y-0.5">
        <p className="text-xl font-bold leading-snug">{data.spaceName}</p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>{data.spaceTypeLabel}</p>
      </div>

      <div
        className="relative w-full overflow-hidden flex-shrink-0"
        style={{ aspectRatio: "16 / 11", background: "var(--tag-bg)" }}
      >
        {data.imageUrl && (
          <Image
            src={data.imageUrl}
            alt={data.spaceName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        )}
      </div>

      {/* 취향 점수·태그는 다이어리 첫인상에서는 보여주지 않는다 — "자세히 보기"(/archive/space/[id])에서
          방문별 점수와 전체 태그를 그대로 확인할 수 있다(데이터는 유지, 첫 화면 노출만 줄임). */}

      {data.guestbookNote && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>내가 남긴 흔적</p>
          <Link
            href={data.guestbookNote.href}
            className="block w-fit max-w-full p-3.5 relative"
            style={{
              background: data.guestbookNote.color,
              transform: "rotate(-1.4deg)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <span
              aria-hidden
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5"
              style={{ background: "#00000018" }}
            />
            <p className="text-[13px] leading-relaxed break-keep line-clamp-4" style={{ color: "#3d3524" }}>
              {data.guestbookNote.content}
            </p>
          </Link>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="text-xs" style={{ color: "var(--dim)" }}>{data.visitCount}번 방문</span>
        <Link href={`/archive/space/${data.spaceId}`} className="text-xs underline" style={{ color: "var(--fg)" }}>
          자세히 보기 →
        </Link>
      </div>
    </div>
  );
}
