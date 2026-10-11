import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { cleanTagName, findTagNameConflict } from "@/lib/tagAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = cleanTagName(body.name);
  if (!name) return NextResponse.json({ error: "태그 이름은 필수예요." }, { status: 400 });
  const conflict = findTagNameConflict(name, await prisma.tag.findMany({ select: { id: true, name: true } }));
  if (conflict) return NextResponse.json({ error: `이미 '${conflict.name}' 태그가 있어요.` }, { status: 409 });

  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const count = await prisma.tag.count({ where: { categoryId } });

  const tag = await prisma.tag.create({
    data: {
      name,
      categoryId,
      description: body.description || null,
      displayOrder: count,
      isActive: true,
      useForRecommendation: body.useForRecommendation ?? true,
    },
  });

  return NextResponse.json(tag, { status: 201 });
}
