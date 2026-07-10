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
    const raw = typeof body.nickname === "string" ? body.nickname.trim() : "";
    if (raw.length === 0) {
      data.nickname = null;
    } else if (raw.length < 2 || raw.length > 12) {
      return NextResponse.json({ error: "닉네임은 2~12자로 입력해주세요." }, { status: 400 });
    } else {
      data.nickname = raw;
    }
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
