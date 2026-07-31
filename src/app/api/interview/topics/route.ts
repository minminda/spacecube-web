import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateTopicTitle } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const validation = validateTopicTitle(title);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const count = await prisma.interviewTopic.count();

  const topic = await prisma.interviewTopic.create({
    data: { title, displayOrder: count },
  });

  return NextResponse.json(topic, { status: 201 });
}
