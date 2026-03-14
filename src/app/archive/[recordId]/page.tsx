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
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">SPACECUBE / ARCHIVE / DETAIL</p>
          <Link href="/archive" className="text-xs" style={{ color: "var(--dim)" }}>&lt; back</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      {record.space.imageUrl && (
        <div className="relative w-full h-40 overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <Image src={record.space.imageUrl} alt={record.space.name} fill className="object-cover opacity-60" />
        </div>
      )}

      <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
        <p>name : {record.space.name}</p>
        <p>type : {record.space.type}</p>
        <p>date : {new Date(record.visitedAt).toLocaleDateString("ko-KR")}</p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 내가 느낀 것</p>
        <div className="flex flex-wrap gap-2">
          {record.tags.map((t) => (
            <span key={t.id} className="text-sm px-3 py-1 border" style={{ borderColor: "var(--fg)" }}>
              [{TAG_LABELS[t.tag]}]
            </span>
          ))}
        </div>
      </div>

      {record.memo && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; 내가 남긴 메모</p>
          <p className="text-sm p-3 border" style={{ borderColor: "var(--border)" }}>
            "{record.memo}"
          </p>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      <Link href={`/space/${record.space.slug}`} className="text-xs" style={{ color: "var(--dim)" }}>
        &gt; 공간 페이지 다시 보기_
      </Link>
    </main>
  );
}
