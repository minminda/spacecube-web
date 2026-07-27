/**
 * 기존 데이터 보존형 마이그레이션 — Tag.category(자유 텍스트) → Category 테이블 승격,
 * 그리고 Space.type(자유 문자열) → "공간 유형" Category/Tag/SpaceTag 백필.
 *
 * prisma db push로 Category 테이블/Tag.categoryId 컬럼이 생긴 뒤 1회 실행한다.
 * 기존 컬럼(Tag.category, Space.type)은 건드리지 않고 그대로 둔 채,
 * 새 구조에 동일한 데이터를 채워 넣기만 하는 순수 추가(additive) 작업이다.
 * 여러 번 실행해도 안전하도록 upsert/조회 후 생성으로 작성했다.
 *
 * 실행: npx tsx prisma/migrate-tag-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPACE_TYPE_CATEGORY_NAME = "공간 유형";

async function migrateExistingCategoryStrings(): Promise<void> {
  console.log("1) 기존 Tag.category(자유 텍스트) → Category 승격...");
  const tags = await prisma.tag.findMany({ where: { category: { not: null } } });
  const distinctValues = [...new Set(tags.map((t) => t.category as string))];

  const categoryIdByName = new Map<string, string>();
  for (let i = 0; i < distinctValues.length; i++) {
    const name = distinctValues[i];
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, selectionType: "MULTI", displayOrder: i },
    });
    categoryIdByName.set(name, category.id);
  }
  console.log(`   ✓ 카테고리 ${distinctValues.length}개 확인/생성 완료`);

  let updated = 0;
  for (const tag of tags) {
    if (tag.categoryId) continue; // 이미 연결된 태그는 건드리지 않는다(재실행 안전)
    const categoryId = categoryIdByName.get(tag.category as string);
    if (!categoryId) continue;
    await prisma.tag.update({ where: { id: tag.id }, data: { categoryId } });
    updated++;
  }
  console.log(`   ✓ 태그 ${tags.length}건 중 ${updated}건 categoryId 연결 완료`);
}

async function createSpaceTypeCategory(): Promise<Map<string, string>> {
  console.log('2) "공간 유형" Category + Space.type 값 → Tag 생성...');
  const spaceTypeCategory = await prisma.category.upsert({
    where: { name: SPACE_TYPE_CATEGORY_NAME },
    update: {},
    create: {
      name: SPACE_TYPE_CATEGORY_NAME,
      selectionType: "SINGLE",
      displayOrder: -1, // 항상 다른 카테고리보다 먼저 표시
    },
  });

  const spaces = await prisma.space.findMany({ select: { type: true } });
  const distinctTypes = [...new Set(spaces.map((s) => s.type).filter((t) => t.trim().length > 0))];

  const tagIdByType = new Map<string, string>();
  for (let i = 0; i < distinctTypes.length; i++) {
    const name = distinctTypes[i];
    let tag = await prisma.tag.findFirst({ where: { categoryId: spaceTypeCategory.id, name } });
    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          name,
          categoryId: spaceTypeCategory.id,
          displayOrder: i,
          isActive: true,
          // 분류일 뿐 취향 신호가 아니므로 추천 벡터 계산에서는 기본적으로 제외한다.
          useForRecommendation: false,
        },
      });
    }
    tagIdByType.set(name, tag.id);
  }
  console.log(`   ✓ 공간 유형 태그 ${distinctTypes.length}개 확인/생성 완료`);
  return tagIdByType;
}

async function backfillSpaceTypeLinks(tagIdByType: Map<string, string>): Promise<void> {
  console.log("3) Space.type → SpaceTag 백필...");
  const spaces = await prisma.space.findMany({ select: { id: true, type: true } });
  let created = 0;
  for (const space of spaces) {
    const tagId = tagIdByType.get(space.type);
    if (!tagId) continue;
    await prisma.spaceTag.upsert({
      where: { spaceId_tagId: { spaceId: space.id, tagId } },
      update: {},
      create: {
        spaceId: space.id,
        tagId,
        weight: 1,
        isPrimary: true,
        // 방문자용 "이 공간은 이런 결이에요" 노출 목록(RecordForm)에는 분류 태그를 보여주지 않는다.
        visibleToUsers: false,
      },
    });
    created++;
  }
  console.log(`   ✓ ${spaces.length}개 공간 처리 (SpaceTag ${created}건 확인/생성)`);
}

async function main() {
  await migrateExistingCategoryStrings();
  const tagIdByType = await createSpaceTypeCategory();
  await backfillSpaceTypeLinks(tagIdByType);
  console.log("✓ 카테고리 마이그레이션 완료 — 기존 컬럼(Tag.category, Space.type)은 그대로 유지됩니다.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
