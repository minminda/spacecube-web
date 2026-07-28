import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 비정상적으로 긴 체류시간(탭을 열어둔 채 방치 등)이 평균을 왜곡하지 않도록 상한을 둔다.
const MAX_DURATION_MS = 30 * 60 * 1000;

interface Props {
  params: Promise<{ episodeId: string }>;
}

/** StoryReadTracker가 페이지를 벗어날 때 sendBeacon으로 한 번 보내는 체류시간/완독 신호. */
export async function POST(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 204 });
  }

  const { episodeId } = await params;

  let body: { durationMs?: unknown; completed?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const rawDuration = typeof body.durationMs === "number" ? body.durationMs : null;
  if (rawDuration == null || !Number.isFinite(rawDuration) || rawDuration < 0) {
    return new NextResponse(null, { status: 204 });
  }
  const durationMs = Math.min(Math.round(rawDuration), MAX_DURATION_MS);
  const completed = body.completed === true;

  // EpisodeRead 행은 페이지 진입 시 이미 생성되어 있으므로 존재하지 않으면 조용히 무시한다.
  await prisma.episodeRead.updateMany({
    where: { userId: session.user.id, episodeId },
    data: { durationMs, ...(completed ? { completedAt: new Date() } : {}) },
  });

  return new NextResponse(null, { status: 204 });
}
