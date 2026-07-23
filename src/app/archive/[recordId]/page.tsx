import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import DeleteRecordButton from "@/components/DeleteRecordButton";

interface Props {
  params: Promise<{ recordId: string }>;
}

export default async function RecordDetailPage({ params }: Props) {
  const { recordId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: { space: true },
  });
  if (!record || record.userId !== user.id) notFound();

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      {/* 헤더 */}
      <nav className="flex justify-between items-center">
        <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>
          ←
        </Link>
        <p className="text-xs" style={{ color: "var(--dim)" }}>아카이브</p>
        <div style={{ width: "1rem" }} />
      </nav>

      {/* 공간 이미지 */}
      {record.space.imageUrl && (
        <div
          className="relative w-full h-48 overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <Image
            src={record.space.imageUrl}
            alt={record.space.name}
            fill
            className="object-cover opacity-60"
          />
        </div>
      )}

      {/* 공간 정보 */}
      <div className="space-y-1">
        <p className="text-base" style={{ color: "var(--fg)" }}>
          {record.space.name}
        </p>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          {new Date(record.visitedAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>
        ─────────────────────────────
      </p>

      {/* 공간 바로가기 */}
      <Link
        href={`/space/${record.space.slug}`}
        className="text-xs"
        style={{ color: "var(--dim)" }}
      >
        공간 보기 →
      </Link>

      <div className="flex-1" />

      {/* 삭제 */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <DeleteRecordButton recordId={record.id} />
      </div>
    </main>
  );
}
