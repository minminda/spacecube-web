import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, Visibility } from "@prisma/client";
import { canChangeNickname, nextNicknameChangeAt } from "@/lib/nickname";
import { formatDotDate } from "@/lib/time";

const VALID_VISIBILITY: Visibility[] = ["PRIVATE", "PARTIAL", "LINK_ONLY"];

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: { nickname?: string | null; nicknameUpdatedAt?: Date; visibility?: Visibility } = {};

  if ("nickname" in body) {
    const raw = typeof body.nickname === "string" ? body.nickname.trim() : "";
    let nextNickname: string | null;
    if (raw.length === 0) {
      nextNickname = null;
    } else if (raw.length < 2 || raw.length > 12) {
      return NextResponse.json({ error: "닉네임은 2~12자로 입력해주세요." }, { status: 400 });
    } else {
      nextNickname = raw;
    }

    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { nickname: true, nicknameUpdatedAt: true },
    });
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 실제로 값이 바뀌는 경우에만 쿨다운/중복 체크 — 같은 값 재저장은 항상 허용.
    if (nextNickname !== current.nickname) {
      if (!canChangeNickname(current.nicknameUpdatedAt)) {
        const nextChangeAt = nextNicknameChangeAt(current.nicknameUpdatedAt)!;
        return NextResponse.json(
          { error: `닉네임은 30일에 한 번만 바꿀 수 있어요. 다음 변경 가능일: ${formatDotDate(nextChangeAt)}`, nextChangeAt: nextChangeAt.toISOString() },
          { status: 429 },
        );
      }
      if (nextNickname !== null) {
        const taken = await prisma.user.findFirst({
          where: { nickname: nextNickname, id: { not: session.user.id } },
          select: { id: true },
        });
        if (taken) {
          return NextResponse.json({ error: "이미 사용 중인 닉네임이에요." }, { status: 409 });
        }
      }
      data.nickname = nextNickname;
      data.nicknameUpdatedAt = new Date();
    }
  }

  if ("visibility" in body) {
    if (!VALID_VISIBILITY.includes(body.visibility))
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    data.visibility = body.visibility;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { nickname: true, nicknameUpdatedAt: true, visibility: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    // 위의 findFirst 체크와 실제 UPDATE 사이 경합(동시에 같은 닉네임 선점)에 대한 최종 방어선.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "이미 사용 중인 닉네임이에요." }, { status: 409 });
    }
    throw err;
  }
}
