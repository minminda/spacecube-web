import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ContentStatusList from "./ContentStatusList";

export default async function ContentStatusPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const spaces = await prisma.space.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, isActive: true,
      episodes: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, episodeNumber: true, title: true, published: true },
      },
    },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / CONTENT STATUS</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>콘텐츠 공개 상태</p>
        <h1 className="text-xl font-bold">공간 {spaces.length}개 한눈에 보기</h1>
      </div>

      <ContentStatusList spaces={spaces} />
    </main>
  );
}
