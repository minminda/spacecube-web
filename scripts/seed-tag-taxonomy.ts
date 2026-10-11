/* ── 태그 체계 정리(additive) ─────────────────────────────────────────────
   관리자 Tag를 정본으로 쓰기 위한 분류 4개와 핵심 태그를 채운다.
   · 이미 있는 이름(공백/대소문자 무시)은 만들지 않는다 — 기존 태그를 분류에 옮기기만 한다(미분류인 것만).
   · 삭제 · 이름 변경 · 기존 분류 변경 없음. 공간 유형 분류는 건드리지 않는다.
   실행: npx tsx scripts/seed-tag-taxonomy.ts          (미리보기)
         npx tsx scripts/seed-tag-taxonomy.ts --apply  (실제 반영) */

import { prisma } from "../src/lib/prisma";
import { normTagName } from "../src/lib/tagAdmin";

const TAXONOMY: { category: string; description: string; tags: string[] }[] = [
  { category: "분위기", description: "공간에서 느껴지는 인상", tags: ["조용한", "편안한", "따뜻한", "감각 있는", "독특한", "집중되는", "영감 있는", "다시 오고 싶은"] },
  { category: "취향", description: "공간이 다루는 콘텐츠 · 취향", tags: ["책", "음악", "LP", "전시", "커피", "디자인", "패션", "소품"] },
  { category: "이용 상황", description: "어떤 때 가기 좋은지", tags: ["혼자", "대화", "오래 머물기", "데이트", "저녁", "산책 중 들르기"] },
  { category: "공간 특징", description: "공간의 물리적 특징", tags: ["작은 공간", "루프탑", "테라스", "예약제"] },
];

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "== APPLY ==" : "== DRY RUN (--apply로 반영) ==");
  const allTags = await prisma.tag.findMany({ select: { id: true, name: true, categoryId: true } });
  const byNorm = new Map(allTags.map((t) => [normTagName(t.name), t]));
  const cats = await prisma.category.findMany();
  let catOrder = cats.length;

  for (const group of TAXONOMY) {
    let cat = cats.find((c) => c.name === group.category);
    if (!cat) {
      console.log(`+ 분류 생성: ${group.category}`);
      if (apply) cat = await prisma.category.create({ data: { name: group.category, selectionType: "MULTI", description: group.description, displayOrder: catOrder++, isActive: true } });
    }
    let order = cat ? await prisma.tag.count({ where: { categoryId: cat.id } }) : 0;
    for (const name of group.tags) {
      const existing = byNorm.get(normTagName(name));
      if (existing) {
        if (existing.categoryId === null) {
          console.log(`  ~ 이동(미분류 → ${group.category}): ${existing.name}`);
          if (apply && cat) await prisma.tag.update({ where: { id: existing.id }, data: { categoryId: cat.id, displayOrder: order++ } });
        } else console.log(`  = 유지: ${existing.name}`);
        continue;
      }
      console.log(`  + 태그 생성(${group.category}): ${name}`);
      if (apply && cat) {
        const created = await prisma.tag.create({ data: { name, categoryId: cat.id, displayOrder: order++, isActive: true, useForRecommendation: true } });
        byNorm.set(normTagName(name), { id: created.id, name, categoryId: cat.id });
      }
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
