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
      {/* 대표 이미지 */}
      <div className="relative w-full h-64 bg-stone-100 flex-shrink-0">
        {space.imageUrl ? (
          <Image src={space.imageUrl} alt={space.name} fill className="object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl font-thin tracking-widest"
            style={{ color: "var(--border)" }}
          >
            □
          </div>
        )}
      </div>

      {/* 공간 정보 */}
      <div className="flex flex-col gap-6 px-6 py-7 flex-1">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>
            {space.type} · {space.location}
          </p>
          <h1 className="text-2xl font-medium">{space.name}</h1>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>이 공간의 이야기</p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{space.description}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>공간의 철학</p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{space.philosophy}</p>
        </div>

        {space.ownerMessage && (
          <div
            className="rounded-2xl p-4 space-y-1"
            style={{ background: "var(--tag-bg)" }}
          >
            <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>운영자의 한마디</p>
            <p className="text-sm leading-relaxed">"{space.ownerMessage}"</p>
          </div>
        )}
      </div>

      {/* CTA 버튼 — 하단 고정 */}
      <div className="sticky bottom-0 px-6 pb-8 pt-4" style={{ background: "var(--bg)" }}>
        {session ? (
          <Link
            href={`/space/${slug}/record`}
            className="block w-full text-center py-3 rounded-full text-sm"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            {hasRecord ? "기록 수정하기" : "이 공간, 기록 남기기"}
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center py-3 rounded-full text-sm"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            로그인하고 기록 남기기
          </Link>
        )}
      </div>
    </main>
  );
}
