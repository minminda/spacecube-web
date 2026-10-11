/* ── 지역 데이터 정리(additive, 삭제 없음) ─────────────────────────────────
   점검에서 찾은 문제:
   · districts 1행이 name "용인" · slug "mangwon"으로 서로 맞지 않음, 실제 공간 지역(연남동 · 망원동 · 용인 처인구)은 목록에 없음
   · 운영 공간(Cube) 아카커피룸의 district가 "처인구"라 공간 등록의 "용인 처인구"와 다른 동네처럼 보임
   처리: ① 그 행을 "용인 처인구"/yongin-cheoin으로 고침 ② 실제 쓰는 지역 연남동 · 망원동을 추가 ③ "처인구" → "용인 처인구"
   · 공간의 area/district 문자열은 건드리지 않는다(②는 이미 그 값이고 ③만 표기 통일). fixture(isDemo) 공간은 대상이 아니다.
   실행: npx tsx --env-file=.env scripts/cleanup-legacy-regions-2026-10-11.ts          (미리보기)
         npx tsx --env-file=.env scripts/cleanup-legacy-regions-2026-10-11.ts --apply  (반영) */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  console.log(apply ? "== APPLY ==" : "== DRY RUN (--apply로 반영) ==");
  const districts = await prisma.district.findMany();
  const byName = new Map(districts.map((d) => [d.name, d]));
  const bySlug = new Map(districts.map((d) => [d.slug, d]));

  const broken = districts.find((d) => d.name === "용인" && d.slug === "mangwon");
  if (broken && !byName.has("용인 처인구") && !bySlug.has("yongin-cheoin")) {
    console.log(`~ 지역 수정: "${broken.name}"/${broken.slug} → "용인 처인구"/yongin-cheoin (order ${broken.order} → 2)`);
    if (apply) await prisma.district.update({ where: { id: broken.id }, data: { name: "용인 처인구", slug: "yongin-cheoin", order: 2 } });
  } else console.log("= 용인 행: 이미 정리됨(또는 대상 아님)");

  for (const [name, slug, order] of [["연남동", "yeonnam", 0], ["망원동", "mangwon", 1]] as const) {
    // slug "mangwon"은 위에서 풀려난 뒤에만 쓸 수 있다
    if (byName.has(name)) { console.log(`= 유지: ${name}`); continue; }
    if (bySlug.has(slug) && bySlug.get(slug) !== broken) { console.log(`! slug 충돌로 건너뜀: ${name}/${slug}`); continue; }
    console.log(`+ 지역 추가: ${name}/${slug} (ACTIVE, order ${order})`);
    if (apply) await prisma.district.create({ data: { name, slug, order, status: "ACTIVE" } });
  }

  const ops = await prisma.space.findMany({ where: { district: "처인구", isDemo: false }, select: { id: true, slug: true } });
  for (const s of ops) {
    console.log(`~ 운영 공간 지역 표기: ${s.slug} "처인구" → "용인 처인구"`);
    if (apply) await prisma.space.update({ where: { id: s.id }, data: { district: "용인 처인구" } });
  }
  console.log("districts 최종:", JSON.stringify((await prisma.district.findMany({ orderBy: { order: "asc" }, select: { name: true, slug: true, status: true, order: true } }))));
}
main().finally(() => prisma.$disconnect());
