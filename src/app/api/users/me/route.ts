import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nickname } = await req.json();
  const cleaned = typeof nickname === "string" ? nickname.trim().slice(0, 20) : null;

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: { nickname: cleaned || null },
  });
  return NextResponse.json({ nickname: updated.nickname });
}
