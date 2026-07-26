import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getCubeUrl } from "@/lib/cube";
import CubeQR from "@/components/CubeQR";

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
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / QR</p>
          <Link href="/admin" className="text-xs" style={{ color: "var(--dim)" }}>&lt; back</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1 text-xs" style={{ color: "var(--dim)" }}>
        <p>&gt; {space.name}</p>
        <p>// 이 공간에 연결된 큐브 QR</p>
      </div>

      {space.cube ? (
        <>
          <div className="flex flex-col items-center p-6 border gap-6" style={{ borderColor: "var(--border)" }}>
            <CubeQR url={getCubeUrl(space.cube.code)} code={space.cube.code} size={220} showActions />
          </div>

          <div className="space-y-2 text-xs" style={{ color: "var(--dim)" }}>
            <p>&gt; 사용 방법</p>
            <p>  1. QR 다운로드 후 인쇄</p>
            <p>  2. 공간 안 큐브 옆에 두기</p>
            <p>  3. 방문자가 스캔하면 공간 페이지로 연결</p>
          </div>

          <div className="p-3 border space-y-1" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--dim)" }}>// 큐브 코드</p>
            <p className="text-xs font-mono break-all">{space.cube.code}</p>
          </div>

          <Link href="/admin/cubes" className="text-xs underline underline-offset-2" style={{ color: "var(--dim)" }}>
            큐브 관리 페이지에서 연결 변경/해제 →
          </Link>
        </>
      ) : (
        <div className="p-6 border space-y-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            이 공간에는 아직 큐브가 연결되지 않았습니다.<br />
            큐브 관리 페이지에서 큐브를 생성하고 이 공간에 연결해주세요.
          </p>
          <Link
            href="/admin/cubes"
            className="inline-block text-sm px-4 py-2 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            [[ 큐브 관리로 이동 ]]
          </Link>
        </div>
      )}
    </main>
  );
}
