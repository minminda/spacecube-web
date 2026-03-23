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
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      type: true,
      openingHours: true,
      imageUrl: true,
    },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between items-center">
          <p className="text-xs">SPACECUBE / DISCOVER</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; home</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 지금 탐험할 지역</p>
        <p className="text-xl tracking-widest">{district.toUpperCase()}</p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {spaces.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-3">
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            &gt; 아직 {district}에 등록된 공간이 없어.<br />
            &nbsp;&nbsp;조금 기다려봐.
          </p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; 다른 지역 보기 _
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            // {spaces.length}곳을 발견했어
          </p>
          <SpaceCards spaces={spaces} />
        </>
      )}
    </main>
  );
}
