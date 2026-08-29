import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { spaceId } = await req.json();
    if (!spaceId) return NextResponse.json({ error: "spaceId required" }, { status: 400 });

    const space = await prisma.space.findUnique({ where: { id: spaceId, isActive: true }, select: { id: true } });
    if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // cube-entry route와 동일하게 sc_anon_id가 있으면 태그한다 — 여기서는 새로 발급하지
    // 않는다(이 경로로 들어온 방문자가 이미 QR을 스캔했었다면 cube-entry에서 이미 쿠키가
    // 심어져 있을 것이므로, 없으면 굳이 새로 만들 이유가 없다).
    const anonId = (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;

    await prisma.spaceScan.create({ data: { spaceId, anonId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
