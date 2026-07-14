import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "태그 이름은 필수예요." }, { status: 400 });

  const count = await prisma.tag.count();

  const tag = await prisma.tag.create({
    data: {
      name,
      category: body.category || null,
      description: body.description || null,
      displayOrder: count,
      isActive: true,
      useForRecommendation: body.useForRecommendation ?? true,
    },
  });

  return NextResponse.json(tag, { status: 201 });
}
