import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const space = await prisma.space.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, isFullyBooked: true },
  });
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(space);
}
