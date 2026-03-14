import Link from "next/link";
import { Tag } from "@prisma/client";
import { TAG_LABELS } from "@/lib/tags";

interface Props {
  searchParams: Promise<{ name?: string; tags?: string }>;
}

export default async function DonePage({ searchParams }: Props) {
  const { name, tags } = await searchParams;
  const spaceName = name ? decodeURIComponent(name) : "이 공간";
  const tagList = tags
    ? (tags.split(",").filter((t) => t in TAG_LABELS) as Tag[])
    : [];

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">SPACECUBE / DONE</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 아카이브에 저장됐어.</p>
        <p className="text-lg">□ {spaceName}</p>
        {tagList.length > 0 && (
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            {tagList.map((t) => `[${TAG_LABELS[t]}]`).join(" ")}
          </p>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <div className="space-y-3">
        <Link
          href="/archive"
          className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          [[ 내 아카이브 보기 ]]
        </Link>
        <Link
          href="/"
          className="block text-xs text-center"
          style={{ color: "var(--dim)" }}
        >
          &lt; 홈으로
        </Link>
      </div>
    </main>
  );
}
