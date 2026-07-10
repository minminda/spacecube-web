import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_CONTENT = 80;

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const note = await prisma.guestbookNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { content?: string; imageUrl?: string | null } = {};

  if ("content" in body) {
    const text = typeof body.content === "string" ? body.content.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    if (text.length > MAX_CONTENT) {
      return NextResponse.json({ error: `content must be ${MAX_CONTENT} characters or less` }, { status: 400 });
    }
    data.content = text;
  }

  if ("imageUrl" in body) {
    data.imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
  }

  const updated = await prisma.guestbookNote.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, content: updated.content, imageUrl: updated.imageUrl });
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const note = await prisma.guestbookNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.guestbookNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
