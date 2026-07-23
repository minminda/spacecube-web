import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 운영자가 /operator에서 자기 공간을 찾는 공개 검색 — 로그인 불필요(운영자 인증은 이후 PIN
// 단계에서 이뤄진다). 이름·지역·유형만 내려주고, PIN 해시·ownerId·통계 등은 select에서
// 애초에 제외해 응답에 절대 포함되지 않는다.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ spaces: [] });

  const spaces = await prisma.space.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, district: true, type: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  return NextResponse.json({ spaces });
}
