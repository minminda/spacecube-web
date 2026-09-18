import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getOrCreateAnonVisitorId } from "@/lib/anonVisitor";

interface Props {
  params: Promise<{ sceneId: string }>;
}

/**
 * SceneReadingProgress가 Scene(2번째부터)에 실제로 스크롤해 도달했을 때 최초 1회만 호출하는
 * Story Depth 신호. EpisodeRead와 동일한 패턴 — 관리자 세션은 아예 행을 만들지 않고(콘텐츠
 * 검수 열람이 KPI에 섞이지 않도록), 로그인 사용자는 userId, 비로그인 방문자는 sc_anon_id
 * 쿠키(anonId, 없으면 새로 발급)로 (identity, sceneId) 유니크 upsert해 서버에서도 중복 저장을
 * 막는다(클라이언트가 두 번 보내도 두 번째는 update: {}로 no-op).
 */
export async function POST(req: NextRequest, { params }: Props) {
  const { sceneId } = await params;

  const scene = await prisma.scene.findUnique({ where: { id: sceneId }, select: { id: true } });
  if (!scene) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await auth();
  if (session?.user?.id) {
    if (isAdmin(session.user.email)) {
      return new NextResponse(null, { status: 204 });
    }
    await prisma.sceneReach.upsert({
      where: { userId_sceneId: { userId: session.user.id, sceneId } },
      create: { userId: session.user.id, sceneId },
      update: {},
    });
    return new NextResponse(null, { status: 204 });
  }

  const store = await cookies();
  const anonId = getOrCreateAnonVisitorId(store);

  await prisma.sceneReach.upsert({
    where: { anonId_sceneId: { anonId, sceneId } },
    create: { anonId, sceneId },
    update: {},
  });

  return new NextResponse(null, { status: 204 });
}
