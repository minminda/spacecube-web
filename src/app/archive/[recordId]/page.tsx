import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TAG_LABELS } from "@/lib/tags";

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
      <div className="flex items-center gap-3">
        <Link href="/archive" className="text-lg" style={{ color: "var(--muted)" }}>←</Link>
        <h2 className="text-base font-medium">{record.space.name}</h2>
      </div>

      {/* 공간 이미지 */}
      <div
        className="relative w-full h-48 rounded-2xl overflow-hidden flex items-center justify-center"
        style={{ background: "var(--tag-bg)" }}
      >
        {record.space.imageUrl ? (
          <Image src={record.space.imageUrl} alt={record.space.name} fill className="object-cover" />
        ) : (
          <span className="text-4xl font-thin" style={{ color: "var(--border)" }}>□</span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--muted)" }}>방문일</p>
        <p className="text-sm">
          {new Date(record.visitedAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--muted)" }}>내가 느낀 것</p>
        <div className="flex flex-wrap gap-2">
          {record.tags.map((t) => (
            <span
              key={t.id}
              className="px-4 py-2 rounded-full text-sm"
              style={{ background: "var(--fg)", color: "var(--bg)" }}
            >
              {TAG_LABELS[t.tag]}
            </span>
          ))}
        </div>
      </div>

      {record.memo && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--muted)" }}>내가 남긴 메모</p>
          <p
            className="text-sm leading-relaxed p-4 rounded-2xl"
            style={{ background: "var(--tag-bg)" }}
          >
            "{record.memo}"
          </p>
        </div>
      )}

      <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Link
          href={`/space/${record.space.slug}`}
          className="text-sm"
          style={{ color: "var(--muted)" }}
        >
          공간 페이지 다시 보기 →
        </Link>
      </div>
    </main>
  );
}
