import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateAnonVisitorId } from "@/lib/anonVisitor";

interface Props {
  params: Promise<{ episodeId: string }>;
}

/**
 * StoryReadTracker가 비로그인 방문자의 스토리 페이지 진입 시 한 번 호출하는 조회 기록.
 * 로그인 사용자의 조회는 episodes/[episodeId]/page.tsx가 렌더 시점에 이미 서버에서 직접
 * 기록하므로(userId 기준 EpisodeRead upsert) 여기서는 조용히 무시한다 — 이 라우트는 익명
 * 방문자 식별(sc_anon_id 발급)과 그 anonId 기준 EpisodeRead 생성만 담당한다.
 */
export async function POST(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (session?.user?.id) {
    return new NextResponse(null, { status: 204 });
  }

  const { episodeId } = await params;
  const episode = await prisma.episode.findUnique({ where: { id: episodeId }, select: { id: true } });
  if (!episode) {
    return new NextResponse(null, { status: 204 });
  }

  const store = await cookies();
  const anonId = getOrCreateAnonVisitorId(store);

  await prisma.episodeRead.upsert({
    where: { anonId_episodeId: { anonId, episodeId } },
    create: { anonId, episodeId },
    update: {},
  });

  return new NextResponse(null, { status: 204 });
}
