import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { cleanTagName, findTagNameConflict, getEditorialTagUsers, normTagName, renameEditorialTag } from "@/lib/tagAdmin";

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
  let renameFrom: string | null = null;
  if (typeof body.name === "string") {
    const name = cleanTagName(body.name);
    if (!name) return NextResponse.json({ error: "태그 이름은 비울 수 없어요." }, { status: 400 });
    const all = await prisma.tag.findMany({ select: { id: true, name: true } });
    const current = all.find((t) => t.id === tagId);
    if (!current) return NextResponse.json({ error: "태그를 찾을 수 없어요." }, { status: 404 });
    const conflict = findTagNameConflict(name, all, tagId);
    if (conflict) return NextResponse.json({ error: `이미 '${conflict.name}' 태그가 있어요.` }, { status: 409 });
    data.name = name;
    if (name !== current.name) renameFrom = current.name;
  }
  if ("categoryId" in body) data.categoryId = body.categoryId || null;
  if ("description" in body) data.description = body.description || null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.useForRecommendation === "boolean") data.useForRecommendation = body.useForRecommendation;

  const tag = await prisma.tag.update({ where: { id: tagId }, data });
  // 공간 등록(EditorialSpace)은 태그를 이름 문자열로 저장하므로 이름이 바뀌면 함께 맞춘다 — 안 그러면 공간에서 태그가 떨어져 나간다.
  const renamedSpaces = renameFrom ? await renameEditorialTag(renameFrom, tag.name) : 0;
  return NextResponse.json({ ...tag, renamedSpaces });
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tagId } = await params;
  const tag = await prisma.tag.findUnique({ where: { id: tagId }, select: { name: true } });
  if (!tag) return NextResponse.json({ error: "태그를 찾을 수 없어요." }, { status: 404 });
  const [recordUsage, spaceUsage, editorialUsers] = await Promise.all([
    prisma.recordTag.count({ where: { tagId } }),
    prisma.spaceTag.count({ where: { tagId } }),
    getEditorialTagUsers(),
  ]);
  const editorialUsage = editorialUsers.get(normTagName(tag.name))?.length ?? 0;

  if (recordUsage > 0 || spaceUsage + editorialUsage > 0) {
    return NextResponse.json(
      { error: `이 태그는 현재 ${spaceUsage + editorialUsage}개 공간${recordUsage > 0 ? `과 방문 기록 ${recordUsage}건` : ""}에서 사용 중이에요. 삭제 대신 비활성화를 이용해주세요.` },
      { status: 409 },
    );
  }

  await prisma.tag.delete({ where: { id: tagId } });
  return NextResponse.json({ ok: true });
}
