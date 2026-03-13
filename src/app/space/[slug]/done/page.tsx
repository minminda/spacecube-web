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
    <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-8 text-center">
      <div className="space-y-3">
        <div className="text-5xl font-thin tracking-widest animate-pulse">□</div>
        <h2 className="text-xl font-medium">이 공간이 아카이브에 담겼어.</h2>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">{spaceName}</p>
        {tagList.length > 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {tagList.map((t) => TAG_LABELS[t]).join(" · ")}
          </p>
        )}
      </div>

      <div className="w-full space-y-3">
        <Link
          href="/archive"
          className="block w-full py-3 rounded-full text-sm"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          내 아카이브 보기
        </Link>
        <Link
          href={`/space/${encodeURIComponent(name ?? "")}`}
          className="block w-full py-3 rounded-full text-sm text-center"
          style={{ color: "var(--muted)" }}
        >
          공간 페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}
