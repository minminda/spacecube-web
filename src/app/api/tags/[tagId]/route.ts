import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ tagId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tagId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if ("category" in body) data.category = body.category || null;
  if ("description" in body) data.description = body.description || null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.useForRecommendation === "boolean") data.useForRecommendation = body.useForRecommendation;

  if (data.name === "") {
    return NextResponse.json({ error: "태그 이름은 비울 수 없어요." }, { status: 400 });
  }

  const tag = await prisma.tag.update({ where: { id: tagId }, data });
  return NextResponse.json(tag);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tagId } = await params;
  const [recordUsage, spaceUsage] = await Promise.all([
    prisma.recordTag.count({ where: { tagId } }),
    prisma.spaceTag.count({ where: { tagId } }),
  ]);

  if (recordUsage > 0 || spaceUsage > 0) {
    return NextResponse.json(
      { error: "이미 사용된 태그는 삭제할 수 없어요. 비활성화를 이용해주세요." },
      { status: 409 },
    );
  }

  await prisma.tag.delete({ where: { id: tagId } });
  return NextResponse.json({ ok: true });
}
