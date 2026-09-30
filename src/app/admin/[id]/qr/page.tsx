import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getCubeUrl } from "@/lib/cube";
import CubeQR from "@/components/CubeQR";
import { AdminPageHeader, adminButtonClass } from "@/components/admin/ui";

interface Props {
  params: Promise<{ id: string }>;
}

// 큐브 QR 체계로 일원화됨 — 이 페이지는 더 이상 URL 직결 QR을 새로 만들지 않는다.
// 이 공간에 이미 배정된 큐브가 있으면 그 QR을 보여주고, 없으면 큐브 관리 페이지로 안내한다.
export default async function QRPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id }, include: { cube: true } });
  if (!space) notFound();

  return (
    <main className="flex flex-col gap-6">

      <AdminPageHeader title="QR" description="이 운영 공간에 연결된 큐브의 QR입니다. 연결 변경·해제는 큐브 관리에서 합니다." />

      {space.cube ? (
        <>
          <div className="a-card flex flex-col items-center p-6 gap-6 max-w-md">
            <CubeQR url={getCubeUrl(space.cube.code)} code={space.cube.code} size={220} showActions />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div className="a-card p-4 space-y-2">
              <p className="a-eyebrow">사용 방법</p>
              <ol className="text-sm space-y-1 list-decimal pl-4" style={{ color: "var(--a-dim)" }}>
                <li>QR 다운로드 후 인쇄</li>
                <li>공간 안 큐브 옆에 두기</li>
                <li>방문자가 스캔하면 공간 페이지로 연결</li>
              </ol>
            </div>
            <div className="a-card p-4 space-y-2">
              <p className="a-eyebrow">큐브 코드</p>
              <p className="text-lg font-mono font-semibold break-all">{space.cube.code}</p>
              <Link href="/admin/cubes" className={adminButtonClass("secondary", "sm")}>큐브 관리에서 연결 변경/해제 →</Link>
            </div>
          </div>
        </>
      ) : (
        <div className="a-card p-6 space-y-3 max-w-xl">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            이 공간에는 아직 큐브가 연결되지 않았습니다.<br />
            큐브 관리 페이지에서 큐브를 생성하고 이 공간에 연결해주세요.
          </p>
          <Link href="/admin/cubes" className={adminButtonClass("primary")}>큐브 관리로 이동</Link>
        </div>
      )}
    </main>
  );
}
