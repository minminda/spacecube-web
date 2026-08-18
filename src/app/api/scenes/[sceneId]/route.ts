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

  // 다중 이미지(최대 3장, 서버에서도 안전하게 재확인) — 보내오면 이 Scene의 기존 SceneImage
  // 행을 통째로 새 목록으로 교체한다(개별 id 추적 없이 순서대로 재생성, displayOrder=배열 인덱스).
  // 레거시 단일 이미지 필드(imageUrl 등, 위)는 그대로 둔다 — images가 있으면 방문자 화면이
  // 그쪽을 우선 사용하므로 굳이 지울 필요가 없다.
  const images: { imageUrl: string; width: number; height: number }[] | null = Array.isArray(body.images)
    ? body.images
        .filter((img: unknown): img is { imageUrl: unknown; width: unknown; height: unknown } => typeof img === "object" && img !== null)
        .map((img: { imageUrl: unknown; width: unknown; height: unknown }) => ({
          imageUrl: typeof img.imageUrl === "string" ? img.imageUrl : "",
          width: typeof img.width === "number" && img.width > 0 ? Math.round(img.width) : 0,
          height: typeof img.height === "number" && img.height > 0 ? Math.round(img.height) : 0,
        }))
        .filter((img: { imageUrl: string; width: number; height: number }) => img.imageUrl && img.width > 0 && img.height > 0)
        .slice(0, 3)
    : null;

  const scene = await prisma.$transaction(async (tx) => {
    const updated = await tx.scene.update({ where: { id: sceneId }, data });
    if (images) {
      await tx.sceneImage.deleteMany({ where: { sceneId } });
      if (images.length > 0) {
        await tx.sceneImage.createMany({
          data: images.map((img, i) => ({ sceneId, imageUrl: img.imageUrl, width: img.width, height: img.height, displayOrder: i })),
        });
      }
    }
    return updated;
  });

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
