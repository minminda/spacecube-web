import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getBaseUrl } from "@/lib/config";
import CubeManager, { type CubeRow, type SpaceOption } from "./CubeManager";
import { AdminPageHeader } from "@/components/admin/ui";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function CubesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { code } = await searchParams;

  const [cubes, spaces, lastScans] = await Promise.all([
    prisma.cube.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        space: { select: { id: true, name: true, slug: true, district: true, imageUrl: true } },
        _count: { select: { scans: true } },
      },
    }),
    prisma.space.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, district: true, imageUrl: true, cube: { select: { code: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.spaceScan.groupBy({
      by: ["cubeId"],
      where: { cubeId: { not: null } },
      _max: { scannedAt: true },
    }),
  ]);

  const lastScanByCube = new Map(lastScans.map((s) => [s.cubeId as string, s._max.scannedAt]));

  const baseUrl = getBaseUrl();

  const cubeRows: CubeRow[] = cubes.map((c) => ({
    id: c.id,
    code: c.code,
    status: c.status,
    space: c.space,
    createdAt: c.createdAt.toISOString(),
    activatedAt: c.activatedAt ? c.activatedAt.toISOString() : null,
    scanCount: c._count.scans,
    lastScanAt: lastScanByCube.get(c.id)?.toISOString() ?? null,
  }));

  const spaceOptions: SpaceOption[] = spaces.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    district: s.district,
    imageUrl: s.imageUrl,
    connectedCubeCode: s.cube?.code ?? null,
  }));

  return (
    <main className="flex flex-col gap-6">

      <AdminPageHeader
        area="cube"
        title="큐브"
        description="운영 공간에 설치할 큐브의 QR을 미리 생성하고, 운영 공간과 연결합니다. 스티커 인쇄도 여기서 합니다."
      />

      <CubeManager cubes={cubeRows} spaceOptions={spaceOptions} baseUrl={baseUrl} initialFocusCode={code ?? null} />
    </main>
  );
}
