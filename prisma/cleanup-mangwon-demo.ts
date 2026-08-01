/**
 * seed-mangwon-demo.ts로 만든 데모 공간 3개(slug가 "demo-mangwon-"로 시작)를 완전히 삭제한다.
 * 실행: npx tsx prisma/cleanup-mangwon-demo.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const targets = await prisma.space.findMany({
    where: { slug: { startsWith: "demo-mangwon-" } },
    select: { id: true, slug: true, name: true },
  });
  if (targets.length === 0) {
    console.log("no demo-mangwon spaces found — nothing to delete.");
    return;
  }
  console.log("deleting:", targets.map((t) => `${t.slug} (${t.name})`));
  await prisma.space.deleteMany({ where: { id: { in: targets.map((t) => t.id) } } });
  console.log(`deleted ${targets.length} demo space(s).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
