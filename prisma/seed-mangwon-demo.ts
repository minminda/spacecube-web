/**
 * 소개서/시연용 — 망원 지역 TOP3 추천 데모 전용 임시 공간 3개 생성.
 * - isActive: false 로 만들어 discover 목록·다른 지역·다른 계정에는 절대 노출되지 않는다
 *   (discover/page.tsx가 일반 조회는 항상 isActive:true만 쓰고, 이 데모 계정 전용 병합 경로만
 *   slug가 "demo-mangwon-"로 시작하는 공간을 별도로 조회한다).
 * - 실행: npx tsx prisma/seed-mangwon-demo.ts
 * - 삭제: npx tsx prisma/cleanup-mangwon-demo.ts (또는 npm run db:cleanup-mangwon-demo)
 */
import { prisma } from "../src/lib/prisma";

const TAG_NAMES = ["영감 있는", "편안한", "독특한", "다시 오고 싶은", "감각 있는", "따뜻한", "집중되는", "조용한"] as const;

const DEMO_SPACES = [
  {
    slug: "demo-mangwon-1",
    name: "[데모] 골목 안 채집소",
    tagline: "망원의 오래된 물건들을 모아 다시 이야기를 붙이는 곳",
    location: "서울 마포구 망원동 (데모)",
    description: "작은 골목 안쪽, 오래된 물건과 사진을 모아 전시하듯 늘어놓은 공간입니다. 정해진 동선 없이 마음 가는 대로 둘러볼 수 있어요.",
    philosophy: "익숙한 물건도 자리를 바꾸면 다르게 보인다는 생각으로 공간을 채웁니다.",
    tags: ["독특한", "다시 오고 싶은", "영감 있는", "감각 있는"],
  },
  {
    slug: "demo-mangwon-2",
    name: "[데모] 낮은 목소리",
    tagline: "대화보다 침묵이 더 편한 사람들을 위한 작업 공간",
    location: "서울 마포구 망원동 (데모)",
    description: "혼자 오래 앉아 책을 읽거나 글을 쓰기 좋은 좌석 배치와 조도를 갖춘 공간입니다. 음악은 거의 들리지 않을 만큼 낮게 틀어둡니다.",
    philosophy: "머무는 사람의 속도를 방해하지 않는 것이 이 공간의 유일한 원칙입니다.",
    tags: ["집중되는", "조용한", "독특한", "편안한"],
  },
  {
    slug: "demo-mangwon-3",
    name: "[데모] 온기 서재",
    tagline: "계절이 바뀌어도 같은 온도를 유지하는 작은 서재",
    location: "서울 마포구 망원동 (데모)",
    description: "책장 사이사이에 작은 조명을 두어, 낮과 밤 어느 시간에 와도 비슷한 분위기를 느낄 수 있게 만들었습니다.",
    philosophy: "다시 왔을 때 지난번과 똑같은 온기를 느낄 수 있어야 한다고 믿습니다.",
    tags: ["따뜻한", "조용한", "영감 있는", "다시 오고 싶은"],
  },
] as const;

// 이 프로젝트의 실제 Cloudinary 계정에 이미 업로드돼 있는 이미지를 재사용한다(새 업로드 없음).
const DEMO_IMAGES = [
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783922146/k89yip2tpn64eekijy4x.jpg",
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783922166/b9hg5nuzb0vkisii3vhw.jpg",
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783923416/tnwqvp3nwiudjcjkt5ks.jpg",
];

async function main() {
  const tags = await prisma.tag.findMany({
    where: { name: { in: [...TAG_NAMES] } },
    select: { id: true, name: true },
  });
  const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

  for (let i = 0; i < DEMO_SPACES.length; i++) {
    const def = DEMO_SPACES[i];
    const existing = await prisma.space.findUnique({ where: { slug: def.slug } });
    if (existing) {
      console.log(`skip (already exists): ${def.slug}`);
      continue;
    }

    const space = await prisma.space.create({
      data: {
        name: def.name,
        slug: def.slug,
        type: "데모",
        district: "망원",
        location: def.location,
        tagline: def.tagline,
        description: def.description,
        philosophy: def.philosophy,
        imageUrl: DEMO_IMAGES[i % DEMO_IMAGES.length],
        isActive: false, // 공개 목록에 절대 노출되지 않음 — 데모 계정 전용 병합 경로에서만 조회
      },
    });

    for (const tagName of def.tags) {
      const tagId = tagIdByName.get(tagName);
      if (!tagId) {
        console.warn(`  ! tag not found: ${tagName}`);
        continue;
      }
      await prisma.spaceTag.create({
        data: { spaceId: space.id, tagId, weight: 1, visibleToUsers: true },
      });
    }

    console.log(`created: ${def.slug} (${space.id})`);
  }

  console.log("done. cleanup: npx tsx prisma/cleanup-mangwon-demo.ts");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
