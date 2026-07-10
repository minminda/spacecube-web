/**
 * '대표 글'(Space.description/philosophy/ownerMessage/experienceGuide/spacePoints/storyItems)을
 * 별도 콘텐츠 형식으로 관리하지 않고, 하나의 Episode(+Scene)로 통합한다.
 *
 * 기존 컬럼은 삭제하지 않는다(SEO 메타 설명 등에서 계속 쓰임). 기존에 관리자가 만든 Episode가
 * 있으면 번호를 한 칸씩 밀고, 이 마이그레이션으로 만든 Episode를 1번으로 끼워 넣는다.
 * 이미 마이그레이션된 공간(제목이 MIGRATED_TITLE인 Episode가 있음)은 건너뛴다 — 재실행 안전.
 *
 * 실행: npx tsx prisma/migrate-story-to-episodes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MIGRATED_TITLE = "공간 이야기";

type StoryItem = { type: "qa"; q: string; a: string } | { type: "image"; url: string };

interface SceneDraft {
  title: string | null;
  content: string;
  imageUrl: string | null;
  displayOrder: number;
}

async function main() {
  const spaces = await prisma.space.findMany({
    include: { episodes: { orderBy: { displayOrder: "asc" } } },
  });

  let migrated = 0;
  let skipped = 0;

  for (const space of spaces) {
    if (space.episodes.some((e) => e.title === MIGRATED_TITLE)) {
      console.log(`skip (already migrated): ${space.name}`);
      skipped++;
      continue;
    }

    const scenesData: SceneDraft[] = [];
    let order = 0;

    if (space.description?.trim()) {
      scenesData.push({ title: null, content: space.description, imageUrl: null, displayOrder: order++ });
    }

    const storyItems = (space.storyItems as StoryItem[] | null) ?? null;
    if (storyItems && storyItems.length > 0) {
      for (const item of storyItems) {
        if (item.type === "qa") {
          scenesData.push({ title: item.q, content: item.a, imageUrl: null, displayOrder: order++ });
        } else {
          scenesData.push({ title: null, content: "", imageUrl: item.url, displayOrder: order++ });
        }
      }
    } else {
      // storyItems가 없던 공간은 레거시 Q&A 필드로 폴백 (SpaceStory.tsx의 기존 렌더링과 동일한 순서/문구)
      if (space.philosophy?.trim()) {
        scenesData.push({ title: "이 공간을 만든 이유가 뭔가요?", content: space.philosophy, imageUrl: null, displayOrder: order++ });
      }
      if (space.ownerMessage?.trim()) {
        scenesData.push({ title: null, content: space.ownerMessage, imageUrl: null, displayOrder: order++ });
      }
      if (space.experienceGuide?.trim()) {
        scenesData.push({ title: "어떻게 경험하면 좋을까요?", content: space.experienceGuide, imageUrl: null, displayOrder: order++ });
      }
      if (space.spacePoints?.trim()) {
        scenesData.push({ title: "이 공간만의 포인트가 있다면?", content: space.spacePoints, imageUrl: null, displayOrder: order++ });
      }
    }

    if (scenesData.length === 0) {
      console.log(`skip (no content to migrate): ${space.name}`);
      skipped++;
      continue;
    }

    // 기존 에피소드 번호를 뒤에서부터 한 칸씩 밀어 1번 자리를 비운다
    const existingDesc = [...space.episodes].sort((a, b) => b.displayOrder - a.displayOrder);
    for (const ep of existingDesc) {
      await prisma.episode.update({
        where: { id: ep.id },
        data: { displayOrder: ep.displayOrder + 1, episodeNumber: ep.episodeNumber + 1 },
      });
    }

    await prisma.episode.create({
      data: {
        spaceId: space.id,
        episodeNumber: 1,
        displayOrder: 0,
        title: MIGRATED_TITLE,
        description: space.tagline ?? null,
        unlockVisitCount: 0,
        published: true,
        imageUrl: space.imageUrl ?? null,
        scenes: { create: scenesData },
      },
    });

    console.log(`migrated: ${space.name} (${scenesData.length} scenes)`);
    migrated++;
  }

  console.log(`✓ 완료 — 마이그레이션 ${migrated}개, 건너뜀 ${skipped}개`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
