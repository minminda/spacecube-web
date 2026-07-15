/**
 * 기존 데이터 보존형 마이그레이션 — SpaceUnlock 모델 도입 이전에는 "Record가 있으면 곧
 * 그 공간을 열람할 수 있다"는 암묵적 정책이었다. SpaceUnlock을 Record와 분리된 별도
 * 권한으로 도입하면서, 기존에 이미 Record를 남긴 사용자들이 하루아침에 자신이 이미
 * 방문했던 공간의 이야기에 접근할 수 없게 되는 회귀를 막기 위해 1회성으로 백필한다.
 *
 * 정책: (userId, spaceId) distinct 조합마다 가장 이른 Record.visitedAt을 unlockedAt으로,
 * 그 공간에 연결된 Cube가 있으면 cubeId로 채워 SpaceUnlock을 만든다(없으면 cubeId=null —
 * 실제로 QR을 스캔했다는 보장은 없지만, 기존 데이터를 임의로 초기화하지 않기 위한 예외적
 * 보정 조치임을 로그에 남긴다). 이미 SpaceUnlock이 있으면 건드리지 않는다(멱등).
 *
 * prisma db push로 SpaceUnlock 테이블이 생긴 뒤 1회 실행한다.
 * 실행: npx tsx prisma/migrate-space-unlock.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pairs = await prisma.record.groupBy({
    by: ["userId", "spaceId"],
    _min: { visitedAt: true },
  });
  console.log(`총 ${pairs.length}개 (userId, spaceId) 조합 확인...`);

  const spaceCubeIds = new Map<string, string>();
  const cubes = await prisma.cube.findMany({ where: { spaceId: { not: null } }, select: { id: true, spaceId: true } });
  for (const c of cubes) {
    if (c.spaceId) spaceCubeIds.set(c.spaceId, c.id);
  }

  let created = 0;
  let skipped = 0;
  let noCube = 0;

  for (const pair of pairs) {
    const existing = await prisma.spaceUnlock.findUnique({
      where: { userId_spaceId: { userId: pair.userId, spaceId: pair.spaceId } },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const cubeId = spaceCubeIds.get(pair.spaceId) ?? null;
    if (!cubeId) noCube++;

    await prisma.spaceUnlock.create({
      data: {
        userId: pair.userId,
        spaceId: pair.spaceId,
        cubeId,
        unlockedAt: pair._min.visitedAt ?? new Date(),
      },
    });
    created++;
  }

  console.log(`생성 ${created}건 / 이미 존재해서 건너뜀 ${skipped}건 / 연결된 큐브 없어 cubeId=null로 채움 ${noCube}건`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
