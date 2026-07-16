import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import DistrictManager from "./DistrictManager";

export default async function DistrictsAdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const [districts, spaceCounts] = await Promise.all([
    prisma.district.findMany({ orderBy: { order: "asc" } }),
    prisma.space.groupBy({
      by: ["district"],
      where: { isActive: true, district: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const countByName = new Map(spaceCounts.map((s) => [s.district, s._count._all]));

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / DISTRICTS</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>지역 관리</p>
        <h1 className="text-xl font-bold">둘러보기 지도 지역 {districts.length}개</h1>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          SVG 지도 도형 자체는 코드에 고정돼 있어요. 여기서는 마커 위치·줌 설정·노출 상태만 바꿀 수 있습니다.
        </p>
      </div>

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
