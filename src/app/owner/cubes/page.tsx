import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import CubeManager, { type CubeRow, type SpaceOption } from "./CubeManager";

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://spacecube-web.vercel.app";

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
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / 큐브 관리</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold">큐브 관리</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          공간에 설치할 큐브의 QR을 미리 생성하고, 등록된 공간과 연결할 수 있습니다.
        </p>
      </div>

      <CubeManager cubes={cubeRows} spaceOptions={spaceOptions} baseUrl={baseUrl} initialFocusCode={code ?? null} />
    </main>
  );
}
