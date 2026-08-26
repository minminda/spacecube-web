import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import MaterialsManager from "./MaterialsManager";

export default async function MaterialsAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const materials = await prisma.material.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / MATERIALS</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>자료 관리</p>
        <h1 className="text-xl font-bold">PDF 자료 {materials.length}개</h1>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          설치 안내서, 소개 자료 같은 PDF를 올리면 운영자에게 바로 전달할 공개 링크가 만들어져요.
        </p>
      </div>

      <MaterialsManager
        initialMaterials={materials.map((m) => ({
          id: m.id,
          title: m.title,
          fileUrl: m.fileUrl,
          originalFileName: m.originalFileName,
          fileSize: m.fileSize,
        }))}
      />
    </main>
  );
}
