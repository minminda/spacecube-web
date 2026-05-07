import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { mood } = await req.json().catch(() => ({})) as { mood?: string };

  const updated = await prisma.space.update({
    where: { id },
    data: { currentMood: mood?.trim() || null },
    select: { currentMood: true },
  });

  return NextResponse.json(updated);
}
