import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/config";
import MaterialsManager from "./MaterialsManager";
import { AdminPageHeader } from "@/components/admin/ui";

export default async function MaterialsAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const materials = await prisma.material.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        area="cube"
        title="운영 자료"
        description={`운영자에게 전달할 설치 안내서·소개 자료 PDF ${materials.length}개. 올리면 ${getBaseUrl().replace(/^https?:\/\//, "")} 도메인의 공개 링크가 만들어져요.`}
      />

      <MaterialsManager
        baseUrl={getBaseUrl()}
        initialMaterials={materials.map((m) => ({
          id: m.id,
          title: m.title,
          slug: m.slug,
          originalFileName: m.originalFileName,
          fileSize: m.fileSize,
        }))}
      />
    </main>
  );
}
