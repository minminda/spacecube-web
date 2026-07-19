/**
 * 큐브 코드 접두사를 SC-####(4자리) → GC-###(3자리)로 바꾼다. 도메인이 gonggancube.com으로
 * 정리되면서 큐브 브랜딩도 GC-로 맞춘다(src/lib/cubeCode.ts 참고). 번호 자체는 유지한 채
 * 포맷만 바꾼다. upsert가 아니라 조건부 update라 여러 번 실행해도 안전(idempotent).
 *
 * 실행: npx tsx prisma/migrate-cube-code-prefix.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const legacyCubes = await prisma.cube.findMany({
    where: { code: { startsWith: "SC-" } },
    select: { id: true, code: true },
  });

  if (legacyCubes.length === 0) {
    console.log("SC- 접두사 큐브 없음 — 변경할 것 없음.");
    return;
  }

  for (const cube of legacyCubes) {
    const match = /^SC-(\d+)$/.exec(cube.code);
    if (!match) {
      console.warn(`형식이 예상과 달라 건너뜀: ${cube.code}`);
      continue;
    }
    const number = parseInt(match[1], 10);
    const newCode = `GC-${String(number).padStart(3, "0")}`;
    await prisma.cube.update({ where: { id: cube.id }, data: { code: newCode } });
    console.log(`${cube.code} → ${newCode}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
