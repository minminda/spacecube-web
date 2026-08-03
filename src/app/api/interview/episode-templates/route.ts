import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateEpisodeTemplateTitle, validateEpisodeTemplateDescription } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const validation = validateEpisodeTemplateTitle(title);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const description = typeof body.description === "string" ? body.description.trim() : "";
  const descValidation = validateEpisodeTemplateDescription(description);
  if (!descValidation.ok) return NextResponse.json({ error: descValidation.error }, { status: 400 });

  const count = await prisma.interviewEpisodeTemplate.count();

  const template = await prisma.interviewEpisodeTemplate.create({
    data: {
      title,
      description: description || null,
      episodeNumber: count + 1,
      displayOrder: count,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
