import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";

export const dynamic = "force-dynamic";

// 운영자가 /operator에서 자기 공간을 찾는 공개 검색 — 로그인 불필요(운영자 인증은 이후 PIN
// 단계에서 이뤄진다). 이름·지역·유형·slug만 내려주고, PIN 해시·ownerId·DB cuid·통계 등은
// select에서 애초에 제외해 응답에 절대 포함되지 않는다 — 이후 화면 이동·인증은 slug만으로
// 이뤄지고 클라이언트는 내부 DB id를 전혀 보지 않는다.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ spaces: [] });

  const spaces = await prisma.space.findMany({
    // 시연·테스트 공간(isDemo)은 부분 검색 결과에 섞이지 않고, 이름을 정확히 입력했을 때만 나온다 —
    // 운영자 화면 시연은 계속 가능(src/lib/demoData.ts). 잠시 비공개(isActive=false)인 실제 공간의
    // 운영자는 계속 로그인할 수 있어야 하므로 isActive로는 거르지 않는다.
    where: {
      name: { contains: q, mode: "insensitive" },
      OR: [{ isDemo: false }, { name: { equals: q, mode: "insensitive" } }],
    },
    select: {
      slug: true, name: true, district: true, type: true,
      spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
    },
    orderBy: { name: "asc" },
    take: 10,
  });

  return NextResponse.json({
    spaces: spaces.map((s) => ({
      slug: s.slug,
      name: s.name,
      district: s.district,
      type: resolveSpaceTypeLabel(s.spaceTagLinks, s.type),
    })),
  });
}
