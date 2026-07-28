import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCubeCode, getCubeByCode, resolveCubeDestination } from "@/lib/cube";
import { resolveEntryDestination } from "@/lib/episodeEntry";
import { createQrAccessToken, grantSpaceUnlock, QR_ACCESS_COOKIE, QR_ACCESS_COOKIE_MAX_AGE_SECONDS } from "@/lib/spaceUnlock";

export const dynamic = "force-dynamic";

/**
 * /c/[code] 페이지가 큐브 상태를 ASSIGNED로 이미 확인한 뒤 이리로 넘긴다. 여기서 다시 한 번
 * 코드로 큐브를 조회해(클라이언트가 넘긴 spaceId/cubeId는 절대 신뢰하지 않는다) 스캔을 기록하고,
 * 로그인 여부와 무관하게 서명된 QR 접근 쿠키를 남긴다 — 공간 "읽기"는 로그인이 필요 없고
 * 오직 실제 QR 스캔만으로 열린다(src/lib/spaceUnlock.ts 참고). 로그인 상태면 추가로 그 자리에서
 * SpaceUnlock DB 행도 즉시 부여한다(로그인 사용자는 쿠키 만료 이후에도 계속 유효하도록).
 * Server Component는 쿠키를 쓸 수 없어 이 Route Handler로 분리했다.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = normalizeCubeCode(code);
  const origin = req.nextUrl.origin;

  const cube = await getCubeByCode(normalizedCode);
  const destination = resolveCubeDestination(cube);
  const debug = process.env.NODE_ENV !== "production";
  if (debug) console.log(`[cube-entry] code=${normalizedCode} destination=${destination.type}`);

  if (destination.type !== "redirect" || !cube || !cube.spaceId) {
    // 이 사이 상태가 바뀌었거나(비활성화 등) 애초에 잘못된 코드라면 안내 화면으로 되돌린다.
    return NextResponse.redirect(new URL(`/c/${normalizedCode}`, origin));
  }

  const session = await auth();
  let userId: string | null = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    userId = user?.id ?? null;
  }
  if (debug) console.log(`[cube-entry] space=${destination.slug} loggedIn=${!!userId}`);

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

  // 사용자가 이미 QR을 찍은 상태이므로, 공간 페이지에서 다시 Episode를 고르게 하지 않고
  // 대표 이야기(없으면 표시 순서가 가장 빠른 공개 이야기)로 바로 들여보낸다. 공개된 이야기가
  // 하나도 없으면 공간 페이지로 폴백(그 페이지가 "준비 중" 상태를 이미 처리한다).
  const entry = await resolveEntryDestination(cube.spaceId);
  const destinationPath =
    entry.type === "episode" ? `/space/${destination.slug}/episodes/${entry.episodeId}` : `/space/${destination.slug}`;

  // logged=1: 이 방문은 이미 위에서 기록했으니, 도착 페이지의 ScanTracker(공간 페이지에만 있음)가
  // 같은 방문을 SpaceScan에 중복으로 남기지 않도록 신호를 함께 보낸다(기존 /c/[code] 동작과 동일).
  const response = NextResponse.redirect(new URL(`${destinationPath}?src=qr&logged=1`, origin));

  // 로그인 여부와 무관하게 항상 QR 접근 쿠키를 남긴다 — 비로그인 방문자는 이 쿠키만으로
  // 12시간 동안 이 공간을 읽을 수 있다(hasAnonymousSpaceAccess).
  const token = createQrAccessToken(normalizedCode, cube.spaceId);
  response.cookies.set(QR_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: QR_ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  if (userId) {
    // 로그인 상태면 추가로 DB에도 즉시 반영 — 이 쿠키가 나중에 만료돼도 로그인 사용자는
    // SpaceUnlock 행으로 계속 유효하다.
    await grantSpaceUnlock(userId, cube.spaceId, cube.id).catch(() => {});
    if (debug) console.log(`[cube-entry] unlock-result=granted-immediately(logged-in) + qr-access-cookie-set`);
  } else if (debug) {
    console.log(`[cube-entry] unlock-result=qr-access-cookie-set(만료 ${QR_ACCESS_COOKIE_MAX_AGE_SECONDS / 3600}시간, 비로그인 열람 허용)`);
  }

  return response;
}
