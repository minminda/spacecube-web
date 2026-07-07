import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_CONTENT = 80;
const DEFAULT_COLOR = "#F6E7A8"; // MVP: 노란 포스트잇 단일 색상

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId, content, x, y, rotation } = await req.json();

  const text = typeof content === "string" ? content.trim() : "";
  if (!spaceId || !text) {
    return NextResponse.json({ error: "spaceId and content are required" }, { status: 400 });
  }
  if (text.length > MAX_CONTENT) {
    return NextResponse.json({ error: `content must be ${MAX_CONTENT} characters or less` }, { status: 400 });
  }
  if (typeof x !== "number" || typeof y !== "number" || !isFinite(x) || !isFinite(y)) {
    return NextResponse.json({ error: "x and y coordinates are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const note = await prisma.guestbookNote.create({
    data: {
      userId: user.id,
      spaceId,
      content: text,
      x,
      y,
      rotation: typeof rotation === "number" && isFinite(rotation) ? rotation : 0,
      color: DEFAULT_COLOR,
    },
  });

  return NextResponse.json(
    {
      id: note.id,
      content: note.content,
      x: note.x,
      y: note.y,
      rotation: note.rotation,
      color: note.color,
      createdAt: note.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
