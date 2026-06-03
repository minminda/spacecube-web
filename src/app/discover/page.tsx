import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SpaceCards from "./SpaceCards";

interface Props {
  searchParams: Promise<{ district?: string }>;
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { district } = await searchParams;
  if (!district) redirect("/");

  const spaces = await prisma.space.findMany({
    where: { district, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, name: true, tagline: true, type: true, openingHours: true, imageUrl: true },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <nav className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
      </nav>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>지금 탐험할 지역</p>
        <h1 className="text-3xl font-bold">{district}</h1>
      </div>

      {spaces.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            아직 {district}에 등록된 공간이 없어. 조금 기다려봐.
          </p>
          <Link href="/" className="text-sm" style={{ color: "var(--dim)" }}>다른 지역 보기 →</Link>
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{spaces.length}곳 발견</p>
          <SpaceCards spaces={spaces} />
        </>
      )}
    </main>
  );
}
