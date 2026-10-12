import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import { AdminPageHeader } from "@/components/admin/ui";
import { getUsedAreaValues } from "@/lib/regionAdmin";
import { countSpacesInRegion, findUnregisteredRegions } from "@/lib/regions";
import type { MapSpace } from "./AdminSpaceMap";
import CoverageWorkspace from "./CoverageWorkspace";

export const dynamic = "force-dynamic";

/** 관리자 Coverage Map — 어느 지역에 어떤 공간을 확보했는지 보는 내부 운영 도구(사용자 지도 아님). */
export default async function AdminSpaceMapPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const { panel } = await searchParams;
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const [districts, used] = await Promise.all([prisma.district.findMany({ orderBy: { order: "asc" } }), getUsedAreaValues()]);
  const spaces = await prisma.space.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, district: true, location: true, lat: true, lng: true,
      isActive: true, isDemo: true, type: true,
      spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
    },
  });

  const data: MapSpace[] = spaces.map((s) => ({
    id: s.id,
    name: s.name,
    district: s.district,
    address: s.location,
    lat: s.lat,
    lng: s.lng,
    status: s.isDemo ? "demo" : s.isActive ? "public" : "private",
    typeLabel: resolveSpaceTypeLabel(s.spaceTagLinks, s.type),
  }));

  return (
    <>
      <AdminPageHeader
        area="cube"
        title="공간 지도"
        description="지역과 운영 공간의 분포를 함께 관리합니다 · 내부 운영용"
      />
      <CoverageWorkspace
        spaces={data}
        initialRegions={districts.map((d) => ({ id: d.id, name: d.name, status: d.status, spaceCount: countSpacesInRegion(d.name, used), lat: d.lat, lng: d.lng }))}
        unregistered={findUnregisteredRegions(used, districts.map((d) => d.name))}
        jsKey={process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY ?? ""}
        scrollToRegions={panel === "regions"}
      />
    </>
  );
}
