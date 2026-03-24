import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Visibility } from "@prisma/client";

const VALID_VISIBILITY: Visibility[] = ["PRIVATE", "PARTIAL", "LINK_ONLY"];

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: { nickname?: string | null; visibility?: Visibility } = {};

  if ("nickname" in body) {
    const n = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 20) : null;
    data.nickname = n || null;
  }

  if ("visibility" in body) {
    if (!VALID_VISIBILITY.includes(body.visibility))
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    data.visibility = body.visibility;
  }

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data,
    select: { nickname: true, visibility: true },
  });
  return NextResponse.json(updated);
}
