import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { spaceId } = await req.json();
    if (!spaceId) return NextResponse.json({ error: "spaceId required" }, { status: 400 });

    const space = await prisma.space.findUnique({ where: { id: spaceId, isActive: true }, select: { id: true } });
    if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.spaceScan.create({ data: { spaceId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
