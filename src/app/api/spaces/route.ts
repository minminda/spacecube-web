import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { name, slug, type, location, description, philosophy, ownerMessage } = await req.json();

  if (!name || !slug || !type || !location || !description || !philosophy) {
    return NextResponse.json({ error: "필수 항목이 빠졌어요." }, { status: 400 });
  }

  const exists = await prisma.space.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json({ error: "이미 사용 중인 주소예요." }, { status: 409 });
  }

  const space = await prisma.space.create({
    data: {
      ownerId: user.id,
      name,
      slug,
      type,
      location,
      description,
      philosophy,
      ownerMessage: ownerMessage || null,
    },
  });

  return NextResponse.json(space, { status: 201 });
}
