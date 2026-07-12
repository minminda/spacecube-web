import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
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
    // 스캔 로그 — 개인정보 최소화를 위해 IP는 저장하지 않고, 로그인 상태일 때만 userId를 남긴다.
    const [session, headerList] = await Promise.all([auth(), headers()]);
    let userId: string | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      userId = user?.id ?? null;
    }

    await prisma.spaceScan
      .create({
        data: {
          spaceId: cube.space.id,
          cubeId: cube.id,
          userId,
          userAgent: headerList.get("user-agent")?.slice(0, 300) ?? null,
          referrer: headerList.get("referer")?.slice(0, 300) ?? null,
          locale: headerList.get("accept-language")?.slice(0, 60) ?? null,
        },
      })
      .catch(() => {
        /* 로그 기록 실패가 방문 자체를 막으면 안 된다 */
      });

    // logged=1: 이 방문은 이미 위에서 기록했으니, 공간 페이지의 ScanTracker가
    // 같은 방문을 SpaceScan에 중복으로 남기지 않도록 신호를 함께 보낸다.
    redirect(`/space/${cube.space.slug}?src=qr&logged=1`);
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
