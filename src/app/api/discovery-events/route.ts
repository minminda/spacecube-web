import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getOrCreateAnonVisitorId } from "@/lib/anonVisitor";
import { DISCOVERY_DEDUPE_WINDOW_MS } from "@/lib/discoveryKpi";

export const dynamic = "force-dynamic";

const TYPES = ["SPACE_VIEW", "MAP_CLICK"] as const;

/**
 * 공개 /spaces/[slug]의 Discovery 이벤트(상세 조회 · 지도 클릭) 기록. 실패해도 화면에는 영향이 없다.
 * - 관리자(로그인)는 기록하지 않는다. 발행되지 않았거나 가상(isDemo) 공간도 기록하지 않는다.
 * - 같은 방문자(userId 또는 anonId)가 같은 공간·종류를 30분 안에 또 보내면 새로고침 중복으로 보고 무시한다.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { spaceId?: unknown; type?: unknown } | null;
    const spaceId = typeof body?.spaceId === "string" ? body.spaceId : null;
    const type = TYPES.find((t) => t === body?.type);
    if (!spaceId || !type) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const session = await auth();
    if (session?.user?.email && isAdmin(session.user.email)) return NextResponse.json({ ok: true, skipped: "admin" });

    const space = await prisma.editorialSpace.findFirst({ where: { id: spaceId, status: "PUBLISHED", isDemo: false }, select: { id: true } });
    if (!space) return NextResponse.json({ ok: true, skipped: "not-tracked" });

    const userId = session?.user?.id ?? null;
    const anonId = getOrCreateAnonVisitorId(await cookies());

    const since = new Date(Date.now() - DISCOVERY_DEDUPE_WINDOW_MS);
    const identity = userId ? [{ userId }, { anonId }] : [{ anonId }];
    const recent = await prisma.discoveryEvent.findFirst({
      where: { spaceId, type, createdAt: { gte: since }, OR: identity },
      select: { id: true },
    });
    if (recent) return NextResponse.json({ ok: true, skipped: "duplicate" });

    await prisma.discoveryEvent.create({ data: { spaceId, type, userId, anonId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
