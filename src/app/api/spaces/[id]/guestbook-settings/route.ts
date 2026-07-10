import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

const LAYOUT_TYPES = ["scatter", "grid", "radial"];

export async function PUT(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const layoutType = LAYOUT_TYPES.includes(body.layoutType) ? body.layoutType : "scatter";
  const backgroundType = body.backgroundType === "image" ? "image" : "color";

  const data = {
    backgroundType,
    backgroundColor: body.backgroundColor || "#0a0a08",
    backgroundImageUrl: body.backgroundImageUrl || null,
    backgroundOpacity: typeof body.backgroundOpacity === "number" ? clamp01(body.backgroundOpacity) : 1,
    layoutType,
    defaultPostitColor: body.defaultPostitColor || "#F6E7A8",
    initialZoom: typeof body.initialZoom === "number" ? body.initialZoom : 1,
    initialX: typeof body.initialX === "number" ? body.initialX : 0,
    initialY: typeof body.initialY === "number" ? body.initialY : 0,
    allowRotation: typeof body.allowRotation === "boolean" ? body.allowRotation : true,
    allowImage: typeof body.allowImage === "boolean" ? body.allowImage : true,
    showNickname: typeof body.showNickname === "boolean" ? body.showNickname : true,
  };

  const settings = await prisma.guestbookSettings.upsert({
    where: { spaceId },
    update: data,
    create: { spaceId, ...data },
  });

  return NextResponse.json(settings);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
