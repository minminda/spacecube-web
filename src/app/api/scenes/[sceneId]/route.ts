import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateSceneFields } from "@/lib/sceneInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ sceneId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneId } = await params;
  const body = await req.json().catch(() => ({}));

  // 실제 콘텐츠 저장("저장" 버튼)일 때만 필수 검증한다 — Scene "생성"(POST)은 빈 껍데기를
  // 먼저 만드는 기존 흐름이라 이 라우트(PATCH)에서만 검증한다. 관리자 클라이언트가 title과
  // content를 항상 함께 보내므로 그 조합일 때만 검사한다.
  if ("title" in body && typeof body.content === "string") {
    const validation = validateSceneFields(typeof body.title === "string" ? body.title : "", body.content);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if ("title" in body) data.title = body.title || null;
  if (typeof body.content === "string") data.content = body.content;
  if ("summary" in body) data.summary = typeof body.summary === "string" ? body.summary || null : null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if ("imageUrl" in body) data.imageUrl = body.imageUrl || null;
  if (typeof body.imageZoom === "number") data.imageZoom = body.imageZoom;
  if (typeof body.imagePositionX === "number") data.imagePositionX = body.imagePositionX;
  if (typeof body.imagePositionY === "number") data.imagePositionY = body.imagePositionY;
  if (body.imageAspectRatio === "3/2" || body.imageAspectRatio === "16/9") {
    data.imageAspectRatio = body.imageAspectRatio;
  }
  if (body.imageFit === "cover" || body.imageFit === "contain") {
    data.imageFit = body.imageFit;
  }

  const scene = await prisma.scene.update({ where: { id: sceneId }, data });
  return NextResponse.json(scene);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneId } = await params;
  const scene = await prisma.scene.findUnique({ where: { id: sceneId }, select: { episodeId: true } });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scene.delete({ where: { id: sceneId } });

  const remaining = await prisma.scene.findMany({
    where: { episodeId: scene.episodeId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((s, i) => prisma.scene.update({ where: { id: s.id }, data: { displayOrder: i } }))
  );

  return NextResponse.json({ ok: true });
}
