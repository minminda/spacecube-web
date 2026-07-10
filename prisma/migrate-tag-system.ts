/**
 * 기존 데이터 보존형 마이그레이션 — enum 기반 Tag → 관리형 Tag 테이블 백필.
 *
 * prisma db push로 새 테이블/컬럼(Tag, SpaceTag, RecordTag.tagId)이 생긴 뒤 1회 실행한다.
 * 기존 컬럼(Space.spaceTags, RecordTag.tag)은 건드리지 않고 그대로 둔 채,
 * 새 구조에 동일한 데이터를 채워 넣기만 하는 순수 추가(additive) 작업이다.
 * 여러 번 실행해도 안전하도록 upsert/skipDuplicates로 작성했다.
 *
 * 실행: npx tsx prisma/migrate-tag-system.ts
 */
import { PrismaClient, TagKey } from "@prisma/client";
import { TAG_LABELS, ALL_TAGS } from "../src/lib/tags";

const prisma = new PrismaClient();

async function seedTags() {
  console.log("1) Tag 마스터 테이블 시드...");
  for (let i = 0; i < ALL_TAGS.length; i++) {
    const key = ALL_TAGS[i];
    await prisma.tag.upsert({
      where: { legacyKey: key },
      update: {},
      create: {
        name: TAG_LABELS[key],
        legacyKey: key,
        displayOrder: i,
        isActive: true,
        useForRecommendation: true,
      },
    });
  }
  const tags = await prisma.tag.findMany({ where: { legacyKey: { not: null } } });
  console.log(`   ✓ ${tags.length}개 태그 확인/생성 완료`);
  return new Map(tags.map((t) => [t.legacyKey as TagKey, t.id]));
}

async function backfillSpaceTags(tagIdByKey: Map<TagKey, string>) {
  console.log("2) Space.spaceTags → SpaceTag 백필...");
  const spaces = await prisma.space.findMany({ select: { id: true, spaceTags: true } });
  let created = 0;
  for (const space of spaces) {
    for (let i = 0; i < space.spaceTags.length; i++) {
      const tagId = tagIdByKey.get(space.spaceTags[i]);
      if (!tagId) continue;
      const result = await prisma.spaceTag.upsert({
        where: { spaceId_tagId: { spaceId: space.id, tagId } },
        update: {},
        create: { spaceId: space.id, tagId, weight: 1, isPrimary: i === 0 },
      });
      if (result) created++;
    }
  }
  console.log(`   ✓ ${spaces.length}개 공간 처리 (SpaceTag ${created}건 확인/생성)`);
}

async function backfillRecordTags(tagIdByKey: Map<TagKey, string>) {
  console.log("3) RecordTag.tag → RecordTag.tagId 백필...");
  const recordTags = await prisma.recordTag.findMany({ where: { tagId: null } });
  let updated = 0;
  for (const rt of recordTags) {
    const tagId = tagIdByKey.get(rt.tag);
    if (!tagId) continue;
    await prisma.recordTag.update({ where: { id: rt.id }, data: { tagId } });
    updated++;
  }
  console.log(`   ✓ ${recordTags.length}건 중 ${updated}건 연결 완료`);
}

async function main() {
  const tagIdByKey = await seedTags();
  await backfillSpaceTags(tagIdByKey);
  await backfillRecordTags(tagIdByKey);
  console.log("✓ 태그 시스템 마이그레이션 완료 — 기존 컬럼은 그대로 유지됩니다.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
