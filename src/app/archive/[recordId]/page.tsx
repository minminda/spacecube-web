import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";
import DeleteRecordButton from "@/components/DeleteRecordButton";

interface Props {
  params: Promise<{ recordId: string }>;
}

export default async function RecordDetailPage({ params }: Props) {
  const { recordId } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: { space: true, tags: true },
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

      {/* 태그 */}
      {record.tags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>그때 내가 느낀 것</p>
          <div className="flex flex-wrap gap-2">
            {record.tags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-3 py-1 border"
                style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
              >
                {TAG_LABELS[t.tag]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 메모 */}
      {record.memo && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>내가 남긴 말</p>
          <p
            className="text-sm p-3 border leading-loose"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          >
            &ldquo;{record.memo}&rdquo;
          </p>
        </div>
      )}

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
