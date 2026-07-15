import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPendingUnlockToken, grantSpaceUnlock, PENDING_UNLOCK_COOKIE, PENDING_UNLOCK_MAX_AGE_SECONDS } from "@/lib/spaceUnlock";

export const dynamic = "force-dynamic";

/**
 * /c/[code] 페이지가 큐브 상태를 ASSIGNED로 이미 확인한 뒤 이리로 넘긴다. 여기서 다시 한 번
 * 코드로 큐브를 조회해(클라이언트가 넘긴 spaceId/cubeId는 절대 신뢰하지 않는다) 스캔을 기록하고,
 * 로그인 상태면 그 자리에서 SpaceUnlock을 부여한다. 비로그인이면 서명된 짧은 만료 쿠키만 남겨
 * 이후 로그인을 완료했을 때 이어서 Unlock을 확정할 수 있게 한다(Server Component는 쿠키를 쓸 수
 * 없어 이 Route Handler로 분리했다).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();
  const origin = req.nextUrl.origin;

  const cube = await prisma.cube.findUnique({
    where: { code: normalizedCode },
    select: { id: true, status: true, spaceId: true, space: { select: { slug: true } } },
  });

  if (!cube || cube.status !== "ASSIGNED" || !cube.spaceId || !cube.space) {
    // 이 사이 상태가 바뀌었거나(비활성화 등) 애초에 잘못된 코드라면 안내 화면으로 되돌린다.
    return NextResponse.redirect(new URL(`/c/${normalizedCode}`, origin));
  }

  const session = await auth();
  let userId: string | null = null;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    userId = user?.id ?? null;
  }

  await prisma.spaceScan
    .create({
      data: {
        spaceId: cube.spaceId,
        cubeId: cube.id,
        userId,
        userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
        referrer: req.headers.get("referer")?.slice(0, 300) ?? null,
        locale: req.headers.get("accept-language")?.slice(0, 60) ?? null,
      },
    })
    .catch(() => {
      /* 로그 기록 실패가 방문 자체를 막으면 안 된다 */
    });

  // logged=1: 이 방문은 이미 위에서 기록했으니, 공간 페이지의 ScanTracker가 같은 방문을
  // SpaceScan에 중복으로 남기지 않도록 신호를 함께 보낸다(기존 /c/[code] 동작과 동일).
  const response = NextResponse.redirect(new URL(`/space/${cube.space.slug}?src=qr&logged=1`, origin));

  if (userId) {
    // 이미 로그인돼 있으면 바로 Unlock을 부여한다 — 쿠키가 필요 없다.
    await grantSpaceUnlock(userId, cube.spaceId, cube.id).catch(() => {});
  } else {
    // 비로그인 — "이 스캔으로 이 공간을 열 자격이 있다"는 서명된 증거만 짧게 남겨서,
    // 이어서 로그인하면 보호 페이지 진입 시 Unlock으로 전환되게 한다(스캔 이력만으로
    // 잠금이 풀리는 게 아니라, 로그인해서 실제 사용자 계정에 귀속돼야 열린다).
    const token = createPendingUnlockToken(normalizedCode, cube.spaceId);
    response.cookies.set(PENDING_UNLOCK_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PENDING_UNLOCK_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  return response;
}
