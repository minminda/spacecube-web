import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const MAX_CONTENT = 80;
const DEFAULT_COLOR = "#F6E7A8"; // 관리자 설정이 없을 때 기본 노란 포스트잇

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId, content, x, y, rotation, imageUrl } = await req.json();

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
  if (!user.nickname) {
    return NextResponse.json({ error: "닉네임을 먼저 설정해주세요.", code: "NICKNAME_REQUIRED" }, { status: 400 });
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, guestbookSettings: { select: { defaultPostitColor: true } } },
  });
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  // 기록을 완료해야 방명록에 흔적을 남길 수 있음
  const hasRecord = await prisma.record.count({ where: { userId: user.id, spaceId } });
  if (hasRecord === 0) {
    return NextResponse.json({ error: "이 공간에 대한 기록을 먼저 남겨주세요." }, { status: 403 });
  }

  // 한 공간에 사용자당 흔적 하나만 — UI에서도 막지만 동시 요청 대비 서버에서도 확인
  const existing = await prisma.guestbookNote.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 이 공간에 흔적을 남기셨어요." }, { status: 409 });
  }

  try {
    const note = await prisma.guestbookNote.create({
      data: {
        userId: user.id,
        spaceId,
        content: text,
        nickname: user.nickname,
        imageUrl: typeof imageUrl === "string" && imageUrl ? imageUrl : null,
        x,
        y,
        rotation: typeof rotation === "number" && isFinite(rotation) ? rotation : 0,
        color: space.guestbookSettings?.defaultPostitColor ?? DEFAULT_COLOR,
      },
    });

    return NextResponse.json(
      {
        id: note.id,
        userId: note.userId,
        content: note.content,
        nickname: note.nickname,
        imageUrl: note.imageUrl,
        x: note.x,
        y: note.y,
        rotation: note.rotation,
        color: note.color,
        createdAt: note.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "이미 이 공간에 흔적을 남기셨어요." }, { status: 409 });
    }
    throw err;
  }
}
