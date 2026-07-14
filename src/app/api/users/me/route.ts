import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Visibility } from "@prisma/client";
import { hasOperatorAccess } from "@/lib/operatorAuth";

const VALID_VISIBILITY: Visibility[] = ["PRIVATE", "PARTIAL", "LINK_ONLY"];

export const dynamic = "force-dynamic";

// Navbar의 "운영 관리" 메뉴 노출 여부 — 루트 레이아웃에서 서버 인증을 확인하면 모든 페이지가
// 강제로 동적 렌더링되므로(정적 페이지 최적화 손실), 클라이언트에서 이 가벼운 엔드포인트로 확인한다.
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ isOperator: false });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ isOperator: false });
  }
  const isOperator = await hasOperatorAccess(user.id, session.user.email);
  return NextResponse.json({ isOperator });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: { nickname?: string | null; visibility?: Visibility } = {};

  if ("nickname" in body) {
    const raw = typeof body.nickname === "string" ? body.nickname.trim() : "";
    if (raw.length === 0) {
      data.nickname = null;
    } else if (raw.length < 2 || raw.length > 12) {
      return NextResponse.json({ error: "닉네임은 2~12자로 입력해주세요." }, { status: 400 });
    } else {
      data.nickname = raw;
    }
  }

  if ("visibility" in body) {
    if (!VALID_VISIBILITY.includes(body.visibility))
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    data.visibility = body.visibility;
  }

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data,
    select: { nickname: true, visibility: true },
  });
  return NextResponse.json(updated);
}
