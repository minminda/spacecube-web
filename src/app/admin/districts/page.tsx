import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader } from "@/components/admin/ui";
import { getUsedAreaValues } from "@/lib/regionAdmin";
import { countSpacesInRegion, findUnregisteredRegions } from "@/lib/regions";
import DistrictManager from "./DistrictManager";

export const dynamic = "force-dynamic";

export default async function DistrictsAdminPage() {
  await requireAdminPage();
  const [districts, used] = await Promise.all([prisma.district.findMany({ orderBy: { order: "asc" } }), getUsedAreaValues()]);

  return (
    <main className="flex flex-col gap-6">
      <AdminPageHeader
        area="system"
        title="지역 관리"
        description="공간 등록에서 고르는 지역 목록이에요. 지역을 추가하고, 이름을 바꾸고, 쓰는 공간 수를 확인하세요."
      />
      <DistrictManager
        initialRegions={districts.map((d) => ({ id: d.id, name: d.name, status: d.status, spaceCount: countSpacesInRegion(d.name, used), lat: d.lat, lng: d.lng }))}
        unregistered={findUnregisteredRegions(used, districts.map((d) => d.name))}
      />
    </main>
  );
}
