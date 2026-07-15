import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function CubeEntryPage({ params }: Props) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const cube = await prisma.cube.findUnique({
    where: { code: normalizedCode },
    select: { id: true, status: true, space: { select: { id: true, slug: true } } },
  });

  if (!cube) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-3">
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          유효하지 않은 공간큐브입니다.
        </p>
      </main>
    );
  }

  if (cube.status === "ASSIGNED" && cube.space) {
    // 스캔 로그 남기기 + (로그인 상태면) SpaceUnlock 즉시 부여 + (비로그인이면) 짧은 만료의
    // 서명 쿠키 발급은 전부 쿠키를 쓸 수 있어야 해서 Server Component가 아닌 Route Handler
    // (/api/cube-entry/[code])에서 처리한다. 이 페이지는 큐브 코드만 다시 실어 넘긴다 —
    // 클라이언트가 spaceId/cubeId를 직접 전달할 수 없게 하기 위함(그 라우트가 코드로 다시 조회).
    redirect(`/api/cube-entry/${normalizedCode}`);
  }

  if (cube.status === "DISABLED") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-3">
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          현재 사용할 수 없는 공간큐브입니다.
        </p>
      </main>
    );
  }

  // UNASSIGNED — 아직 공간과 연결되지 않은 큐브
  const session = await auth();
  const admin = !!session?.user?.email && isAdmin(session.user.email);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-5">
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
        {"아직 공간과 연결되지 않은 큐브입니다.\n\n설치가 완료된 후\n이 공간의 이야기가 열립니다."}
      </p>
      {admin && (
        <Link
          href={`/owner/cubes?code=${encodeURIComponent(normalizedCode)}`}
          className="text-sm px-5 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          style={{ borderColor: "var(--fg)" }}
        >
          이 큐브를 공간에 연결하기
        </Link>
      )}
    </main>
  );
}
