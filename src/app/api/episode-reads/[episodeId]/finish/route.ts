import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";

// 비정상적으로 긴 체류시간(탭을 열어둔 채 방치 등)이 평균을 왜곡하지 않도록 상한을 둔다.
const MAX_DURATION_MS = 30 * 60 * 1000;

interface Props {
  params: Promise<{ episodeId: string }>;
}

/** StoryReadTracker가 페이지를 벗어날 때 sendBeacon으로 한 번 보내는 체류시간/완독 신호.
 * 로그인 사용자는 userId 기준, 비로그인 방문자는 sc_anon_id 쿠키(anonId) 기준으로 같은
 * EpisodeRead 행을 갱신한다 — 여기서는 anonId를 새로 발급하지 않는다(episode-reads/view
 * 라우트가 조회 시점에 이미 심어뒀어야 하고, 없으면 그 조회 자체가 기록되지 않은 것이므로
 * 조용히 무시하는 게 맞다). */
export async function POST(req: NextRequest, { params }: Props) {
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

  const session = await auth();

  // 로그인 사용자 — 관리자 세션이면 애초에 EpisodeRead 행 자체가 생성되지 않으므로
  // (episodes/[episodeId]/page.tsx 참고) 아래 updateMany는 자연히 0건에 그친다. 그래도
  // 요청 자체를 조용히 무시해 불필요한 쓰기 시도를 만들지 않는다.
  if (session?.user?.id) {
    if (isAdmin(session.user.email)) {
      return new NextResponse(null, { status: 204 });
    }
    // EpisodeRead 행은 페이지 진입 시 이미 생성되어 있으므로 존재하지 않으면 조용히 무시한다.
    // 뒤로가기 후 다시 들어와 짧게 머문 두 번째 세션이 앞선 긴 체류시간을 덮어써 "평균 체류시간"
    // KPI를 왜곡하지 않도록, 기존 값보다 짧으면 갱신하지 않고 더 긴 값만 반영한다.
    const existing = await prisma.episodeRead.findUnique({
      where: { userId_episodeId: { userId: session.user.id, episodeId } },
      select: { durationMs: true },
    });
    await prisma.episodeRead.updateMany({
      where: { userId: session.user.id, episodeId },
      data: { durationMs: Math.max(existing?.durationMs ?? 0, durationMs), ...(completed ? { completedAt: new Date() } : {}) },
    });
    return new NextResponse(null, { status: 204 });
  }

  // 비로그인 방문자 — 조회 시점(episode-reads/view)에 이미 심어졌을 anonId 쿠키로만 갱신한다.
  const anonId = (await cookies()).get(ANON_VISITOR_COOKIE)?.value;
  if (!anonId) {
    return new NextResponse(null, { status: 204 });
  }
  const existing = await prisma.episodeRead.findUnique({
    where: { anonId_episodeId: { anonId, episodeId } },
    select: { durationMs: true },
  });
  await prisma.episodeRead.updateMany({
    where: { anonId, episodeId },
    data: { durationMs: Math.max(existing?.durationMs ?? 0, durationMs), ...(completed ? { completedAt: new Date() } : {}) },
  });

  return new NextResponse(null, { status: 204 });
}
