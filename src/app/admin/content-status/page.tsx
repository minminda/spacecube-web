import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ContentStatusList from "./ContentStatusList";
import { AdminPageHeader, adminButtonClass } from "@/components/admin/ui";

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
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        area="cube"
        title="에피소드"
        description={`운영 공간 ${spaces.length}곳의 공개 상태와 에피소드 발행 상태를 한눈에 보고 바로 전환합니다. 에피소드 본문은 각 운영 공간의 에피소드 탭에서 편집합니다.`}
        actions={<Link href="/admin/interview" className={adminButtonClass("secondary")}>인터뷰 질문 라이브러리 →</Link>}
      />

      <ContentStatusList spaces={spaces} />
    </main>
  );
}
