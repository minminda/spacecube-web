import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import DistrictManager from "./DistrictManager";
import { AdminPageHeader } from "@/components/admin/ui";

export default async function DistrictsAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const [districts, spaceCounts] = await Promise.all([
    prisma.district.findMany({ orderBy: { order: "asc" } }),
    prisma.space.groupBy({
      by: ["district"],
      // 사용자 지도에 실제로 보이는 공간 수 — 시연 공간(isDemo)은 공개 목록에서 빠지므로 세지 않는다.
      where: { isActive: true, isDemo: false, district: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const countByName = new Map(spaceCounts.map((s) => [s.district, s._count._all]));

  return (
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        area="system"
        title="지역"
        description={`둘러보기 지도의 지역 ${districts.length}개. SVG 지도 도형 자체는 코드에 고정돼 있어요. 여기서는 마커 위치·줌 설정·노출 상태만 바꿀 수 있습니다.`}
      />

      <DistrictManager
        initialDistricts={districts.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          status: d.status,
          tagline: d.tagline ?? "",
          markerX: d.markerX,
          markerY: d.markerY,
          zoomX: d.zoomX,
          zoomY: d.zoomY,
          zoomScale: d.zoomScale,
          spaceCount: countByName.get(d.name) ?? 0,
        }))}
      />
    </main>
  );
}
