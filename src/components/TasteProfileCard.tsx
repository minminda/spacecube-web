import Link from "next/link";

/* 사람보다 취향·공간이 먼저 보이는 카드 — 팔로우/좋아요/랭킹 없이
   "취향 한 줄 + 대표 태그 + 좋아한 공간"만 담백하게 보여준다.
   '내 취향과 닮은 사람'과 '관심 있는 취향' 양쪽에서 공용으로 쓴다. */

interface SpaceRef {
  id: string;
  name: string;
}

interface Props {
  href: string;
  nickname?: string | null;
  phrase: string;
  tagLabels: string[];
  spaces: SpaceRef[];
  note?: string; // 유사도 문구 등 보조 한 줄
}

export default function TasteProfileCard({ href, nickname, phrase, tagLabels, spaces, note }: Props) {
  return (
    <Link href={href} className="block space-y-3 pl-4 border-l" style={{ borderColor: "var(--border)" }}>
      {nickname && (
        <p className="text-xs" style={{ color: "var(--dim)" }}>{nickname}</p>
      )}
      <p className="text-sm font-medium leading-snug">{phrase}</p>
      {tagLabels.length > 0 && (
        <p className="text-xs" style={{ color: "var(--dim)" }}>{tagLabels.join(" · ")}</p>
      )}
      {spaces.length > 0 && (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          {spaces.map((s) => s.name).join(" · ")}
        </p>
      )}
      {note && (
        <p className="text-xs" style={{ color: "var(--border)" }}>{note}</p>
      )}
    </Link>
  );
}
