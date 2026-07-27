import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ categoryId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categoryId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.selectionType === "SINGLE" || body.selectionType === "MULTI") data.selectionType = body.selectionType;
  if ("description" in body) data.description = body.description || null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (data.name === "") {
    return NextResponse.json({ error: "카테고리 이름은 비울 수 없어요." }, { status: 400 });
  }

  try {
    const category = await prisma.category.update({ where: { id: categoryId }, data });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "이미 같은 이름의 카테고리가 있어요." }, { status: 409 });
  }
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categoryId } = await params;
  const tagCount = await prisma.tag.count({ where: { categoryId } });
  if (tagCount > 0) {
    return NextResponse.json(
      { error: "먼저 하위 태그를 다른 카테고리로 옮기거나 삭제해주세요." },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return NextResponse.json({ ok: true });
}
