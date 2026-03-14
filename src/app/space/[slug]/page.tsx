import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SpacePage({ params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({ where: { slug, isActive: true } });
  if (!space) notFound();

  const session = await auth();
  let hasRecord = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const record = await prisma.record.findUnique({
        where: { userId_spaceId: { userId: user.id, spaceId: space.id } },
      });
      hasRecord = !!record;
    }
  }

  return (
    <main className="flex flex-col min-h-screen">
      {space.imageUrl && (
        <div className="relative w-full h-48 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <Image src={space.imageUrl} alt={space.name} fill className="object-cover opacity-60" />
        </div>
      )}

      <div className="flex flex-col gap-5 px-6 py-6 flex-1">
        <div className="space-y-1" style={{ color: "var(--dim)" }}>
          <p className="text-xs">SPACECUBE / SPACE</p>
          <p className="text-xs">─────────────────────────────</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs" style={{ color: "var(--dim)" }}>name : {space.name}</p>
          <p className="text-xs" style={{ color: "var(--dim)" }}>type : {space.type}</p>
          <p className="text-xs" style={{ color: "var(--dim)" }}>loc  : {space.location}</p>
        </div>

        <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 이 공간의 이야기</p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{space.description}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 공간의 철학</p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{space.philosophy}</p>
        </div>

        {space.ownerMessage && (
          <>
            <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 운영자의 한마디</p>
              <p className="text-sm">"{space.ownerMessage}"</p>
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 px-6 pb-8 pt-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {session ? (
          <Link
            href={`/space/${slug}/record`}
            className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {hasRecord ? "[[ 기록 수정하기 ]]" : "[[ 이 공간, 기록 남기기 ]]"}
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            [[ 로그인하고 기록 남기기 ]]
          </Link>
        )}
      </div>
    </main>
  );
}
