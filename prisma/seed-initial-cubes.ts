/**
 * 실물 큐브 2개(GC-001, GC-002) 주문 완료 — 개발/테스트용으로 DB에 미리 만들어둔다.
 * upsert 기반이라 여러 번 실행해도 안전(idempotent). 어떤 공간에도 자동 연결하지 않고
 * 기본 상태(UNASSIGNED)로만 생성한다 — 공간 연결은 관리자가 /admin/cubes에서 직접 한다.
 *
 * 실행: npx tsx prisma/seed-initial-cubes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_CODES = ["GC-001", "GC-002"];

async function main() {
  for (const code of INITIAL_CODES) {
    const cube = await prisma.cube.upsert({
      where: { code },
      update: {},
      create: { code },
    });
    console.log(`${code} — status: ${cube.status}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
