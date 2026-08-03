/**
 * 인터뷰 질문 라이브러리 EP.1 "첫 만남" 기본 구성 시드.
 *
 * episodeNumber(unique)/title 기준으로 존재 여부를 먼저 확인한 뒤 생성하므로
 * 여러 번 실행해도 중복 생성되지 않는다(idempotent).
 *
 * 실행: npx tsx prisma/seed-interview-ep1.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SceneTopicSeed {
  title: string;
  description: string;
  questions: string[];
}

const EP1_DESCRIPTION =
  "방문자가 공간큐브를 처음 열었을 때 읽는 첫 번째 이야기입니다. " +
  "공간이 시작된 이유와 지금의 모습을 만든 선택, 사람들과 쌓인 기억을 통해 이 공간을 처음 이해하도록 돕습니다.";

const EP1_SCENE_TOPICS: SceneTopicSeed[] = [
  {
    title: "공간이 시작되기 전",
    description: "이 공간이 생겨나기 전의 계기와 배경",
    questions: [
      "왜 이 공간을 만들기로 했나요?",
      "처음부터 지금과 같은 모습이었나요?",
      "왜 이 동네를 선택했나요?",
      "이 공간을 열기 전에는 어떤 일을 하고 계셨나요?",
      "처음 시작할 때 가장 고민했던 것은 무엇이었나요?",
    ],
  },
  {
    title: "공간을 만들며 했던 선택",
    description: "지금의 공간을 만든 기준과 선택",
    questions: [
      "가장 오래 고민했던 결정은 무엇인가요?",
      "메뉴나 상품보다 먼저 지키려고 한 것은 무엇인가요?",
      "절대 바꾸고 싶지 않은 것이 있나요?",
      "예상과 가장 달랐던 점은 무엇인가요?",
      "지금도 그대로 유지하는 이유가 있나요?",
    ],
  },
  {
    title: "사람 때문에 기억에 남은 순간",
    description: "손님과 함께하며 공간에 남은 기억",
    questions: [
      "가장 기억나는 손님이 있나요?",
      "가장 기뻤던 순간은 언제였나요?",
      "예상하지 못했던 손님의 말이 있었나요?",
      "이 공간을 하길 잘했다고 느꼈던 순간은 언제였나요?",
    ],
  },
  {
    title: "지금도 고민하는 것",
    description: "현재의 고민과 앞으로의 방향",
    questions: [
      "지금 가장 어려운 점은 무엇인가요?",
      "처음 생각과 가장 달라진 점은 무엇인가요?",
      "다시 시작한다면 바꾸고 싶은 것이 있나요?",
      "앞으로 이 공간이 어떻게 기억되면 좋겠나요?",
    ],
  },
  {
    title: "방문자가 알았으면 하는 것",
    description: "검색만으로는 알기 어려운 공간의 모습",
    questions: [
      "사람들이 가장 오해하는 것은 무엇인가요?",
      "검색으로는 알 수 없는 이야기가 있나요?",
      "손님들이 놓치기 쉬운 공간이나 요소가 있나요?",
      "가장 애착이 가는 자리나 물건이 있나요?",
      "처음 오는 분들이 무엇을 발견했으면 좋겠나요?",
    ],
  },
];

async function main() {
  const template = await prisma.interviewEpisodeTemplate.upsert({
    where: { episodeNumber: 1 },
    update: {},
    create: {
      episodeNumber: 1,
      title: "첫 만남",
      description: EP1_DESCRIPTION,
      displayOrder: 0,
    },
  });
  console.log(`✓ EP.1 템플릿 확인/생성: ${template.title} (${template.id})`);

  for (let i = 0; i < EP1_SCENE_TOPICS.length; i++) {
    const seed = EP1_SCENE_TOPICS[i];

    let sceneTopic = await prisma.interviewSceneTopic.findFirst({
      where: { episodeTemplateId: template.id, title: seed.title },
    });
    if (!sceneTopic) {
      sceneTopic = await prisma.interviewSceneTopic.create({
        data: {
          episodeTemplateId: template.id,
          title: seed.title,
          description: seed.description,
          displayOrder: i,
        },
      });
      console.log(`  ✓ Scene 소재 생성: ${seed.title}`);
    } else {
      console.log(`  · Scene 소재 이미 존재, 건너뜀: ${seed.title}`);
    }

    const existingQuestions = await prisma.interviewQuestion.findMany({
      where: { topicId: sceneTopic.id },
      select: { content: true },
    });
    const existingContents = new Set(existingQuestions.map((q) => q.content));

    let created = 0;
    for (let j = 0; j < seed.questions.length; j++) {
      const content = seed.questions[j];
      if (existingContents.has(content)) continue;
      await prisma.interviewQuestion.create({
        data: {
          topicId: sceneTopic.id,
          content,
          displayOrder: existingQuestions.length + created,
        },
      });
      created++;
    }
    console.log(`    · 질문 ${seed.questions.length}개 중 ${created}개 신규 생성`);
  }

  console.log("✓ EP.1 기본 구성 시드 완료");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
