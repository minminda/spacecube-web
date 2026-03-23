import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface Props {
  searchParams: Promise<{ district?: string }>;
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { district } = await searchParams;
  if (!district) redirect("/");

  const spaces = await prisma.space.findMany({
    where: { district, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      {/* 헤더 */}
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between items-center">
          <p className="text-xs">SPACECUBE / DISCOVER</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; home</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      {/* 지역 타이틀 */}
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
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            // {spaces.length}곳을 발견했어
          </p>

          {spaces.map((space) => (
            <Link
              key={space.id}
              href={`/space/${space.slug}`}
              className="flex flex-col border transition-colors hover:border-[var(--fg)]"
              style={{ borderColor: "var(--border)" }}
            >
              {space.imageUrl && (
                <div className="relative w-full h-40 overflow-hidden">
                  <Image
                    src={space.imageUrl}
                    alt={space.name}
                    fill
                    className="object-cover opacity-60"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <p className="text-sm">&gt; {space.name}</p>
                {space.tagline && (
                  <p className="text-xs italic" style={{ color: "var(--dim)" }}>
                    &ldquo;{space.tagline}&rdquo;
                  </p>
                )}
                <div className="flex gap-3 text-xs" style={{ color: "var(--dim)" }}>
                  <span>[{space.type}]</span>
                  {space.openingHours && <span>{space.openingHours}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
