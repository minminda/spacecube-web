import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { tags: { orderBy: { displayOrder: "asc" } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "카테고리 이름은 필수예요." }, { status: 400 });

  const selectionType = body.selectionType === "SINGLE" ? "SINGLE" : "MULTI";
  const count = await prisma.category.count();

  try {
    const category = await prisma.category.create({
      data: {
        name,
        selectionType,
        description: body.description || null,
        displayOrder: count,
        isActive: true,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "이미 같은 이름의 카테고리가 있어요." }, { status: 409 });
  }
}
