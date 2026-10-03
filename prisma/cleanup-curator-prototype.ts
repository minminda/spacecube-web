/**
 * 큐레이터 프로토타입 더미 데이터 삭제 — 가상 큐레이터 User(프로필·컬렉션·연결 cascade) → 가상 공간(저장 기록 cascade) 순.
 * isDemo=true 행만 지운다. 실제 공간·실제 큐레이터·실제 컬렉션은 건드리지 않는다.
 * 실제 컬렉션이 가상 공간을 연결해 두었다면(onDelete Restrict) 그 가상 공간은 남기고 알려준다.
 *
 * 실행: npx tsx prisma/cleanup-curator-prototype.ts   (= npm run db:cleanup-curator-prototype)
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  // 가상 큐레이터의 User(이메일 proto-curator+…, isDemo)를 지우면 프로필·컬렉션·공간 연결이 함께 지워진다.
  const users = await prisma.user.deleteMany({ where: { isDemo: true, email: { startsWith: "proto-curator+", endsWith: "@spacecube.local" } } });
  const curators = await prisma.curatorProfile.deleteMany({ where: { isDemo: true } });
  const orphanCollections = await prisma.curatorCollection.deleteMany({ where: { isDemo: true } });
  const demoSpaces = await prisma.editorialSpace.findMany({
    where: { isDemo: true },
    select: { id: true, slug: true, _count: { select: { curatorPicks: true, curationLinks: true, personLinks: true, thoughtLinks: true } } },
  });
  const blocked = demoSpaces.filter((s) => s._count.curatorPicks + s._count.curationLinks + s._count.personLinks + s._count.thoughtLinks > 0);
  const removable = demoSpaces.filter((s) => !blocked.includes(s)).map((s) => s.id);
  const spaces = await prisma.editorialSpace.deleteMany({ where: { id: { in: removable }, isDemo: true } });
  console.log(`삭제: 가상 큐레이터 User ${users.count} · 남은 가상 프로필 ${curators.count} · 남은 가상 컬렉션 ${orphanCollections.count} · 가상 공간 ${spaces.count}`);
  if (blocked.length) console.warn("다른 콘텐츠가 연결하고 있어 남긴 가상 공간:", blocked.map((b) => b.slug));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
