/**
 * EP.1 "첫 만남" 인터뷰 질문 라이브러리 데이터 초기화 — 기존 질문(주제 1개당 최대 5개,
 * 총 23개)을 전부 제거하고 Scene 소재 5개에 각각 새 질문 10개(총 50개)로 교체한다.
 *
 * EP.1 자체와 Scene 소재 5개는 삭제/개명하지 않는다 — 오직 그 아래 InterviewQuestion만
 * 갈아 끼운다. InterviewQuestion은 어떤 다른 모델에서도 참조하지 않고(질문지 생성 이력도
 * 저장하지 않음, src/lib/interviewQuestionnaire.ts 참고) Scene 소재 1개에만 종속되는
 * 구조라 hard delete가 안전하다.
 *
 * 매 실행마다 "해당 Scene 소재의 질문 전부 삭제 → 새 10개 생성"을 트랜잭션 하나로 묶어서
 * 실행하므로, 몇 번을 다시 실행해도 결과는 항상 동일한 50개다(idempotent). 트랜잭션이라
 * 중간에 실패하면 그 Scene 소재를 포함해 전체가 롤백된다.
 *
 * 실행: npx tsx prisma/reset-ep1-interview-questions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EP1_EPISODE_NUMBER = 1;

interface SceneTopicQuestionSet {
  title: string;
  description: string;
  questions: string[];
}

const EP1_SCENE_TOPIC_QUESTIONS: SceneTopicQuestionSet[] = [
  {
    title: "공간이 시작되기 전",
    description: "이 공간이 생겨나기 전의 계기와 배경",
    questions: [
      "왜 이 공간을 만들기로 했나요?",
      "언제 ‘이 공간을 해야겠다’고 결심하셨나요?",
      "이 공간을 열기 전에는 어떤 일을 하고 계셨나요?",
      "왜 이 동네를 선택하게 되었나요?",
      "처음부터 지금과 같은 공간을 상상하셨나요?",
      "시작할 때 가장 두려웠던 것은 무엇이었나요?",
      "주변 사람들은 이 공간을 시작한다고 했을 때 어떤 반응이었나요?",
      "포기하고 싶었던 순간이 있었나요? 있었다면 언제였나요?",
      "지금 돌아보면 그때의 선택을 하길 잘했다고 느끼는 이유는 무엇인가요?",
      "만약 다시 시작한다면, 여전히 이 공간을 만들었을 것 같나요?",
    ],
  },
  {
    title: "공간을 만들며 했던 선택",
    description: "지금의 공간을 만든 기준과 선택",
    questions: [
      "가장 오래 고민했던 결정은 무엇인가요?",
      "이 공간에서 가장 중요하게 지키고 싶은 기준은 무엇인가요?",
      "절대 바꾸고 싶지 않은 것이 있나요?",
      "손해를 보더라도 계속 유지하고 있는 것이 있나요?",
      "예상과 가장 달랐던 점은 무엇인가요?",
      "공간을 만들면서 가장 만족스러웠던 선택은 무엇인가요?",
      "가장 많은 시행착오를 겪었던 부분은 무엇인가요?",
      "방문자들이 잘 알아차리지 못하지만 꼭 알아주었으면 하는 선택이 있나요?",
      "이 공간을 가장 ‘나다운 공간’으로 만드는 요소는 무엇인가요?",
      "지금도 계속 고민하며 바꾸고 있는 부분이 있나요?",
    ],
  },
  {
    title: "사람 때문에 기억에 남은 순간",
    description: "손님과 함께하며 공간에 남은 기억",
    questions: [
      "가장 기억에 남는 손님이 있나요?",
      "가장 기뻤던 순간은 언제였나요?",
      "예상하지 못했던 손님의 말이 있었나요?",
      "이 공간을 하길 잘했다고 느꼈던 순간은 언제였나요?",
      "아직도 잊히지 않는 에피소드가 있다면 들려주세요.",
      "손님 덕분에 생각이 바뀌었던 경험이 있나요?",
      "이 공간에서 가장 많이 들었던 말은 무엇인가요?",
      "운영하시면서 가장 감동받았던 순간은 언제였나요?",
      "다시 만나고 싶은 손님이 있다면 어떤 분인가요?",
      "이 공간을 오래 운영해야겠다고 마음먹게 만든 순간이 있었나요?",
    ],
  },
  {
    title: "지금도 고민하는 것",
    description: "현재의 고민과 앞으로의 방향",
    questions: [
      "지금 가장 고민이 되는 것은 무엇인가요?",
      "공간을 시작했을 때와 가장 달라진 점은 무엇인가요?",
      "다시 시작한다면 가장 먼저 바꾸고 싶은 것이 있나요?",
      "앞으로 이 공간이 어떻게 기억되었으면 하나요?",
      "아직 이루지 못한 목표가 있다면 무엇인가요?",
      "운영하면서 가장 어려운 결정은 무엇인가요?",
      "앞으로 더 만들어가고 싶은 공간의 모습은 어떤 모습인가요?",
      "지금도 계속 배우고 있다고 느끼는 부분이 있나요?",
      "손님들에게 앞으로 더 해주고 싶은 경험이 있다면 무엇인가요?",
      "5년 뒤 이 공간은 어떤 모습이길 바라시나요?",
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
      "이 공간을 가장 잘 즐기는 방법이 있다면 무엇인가요?",
      "방문자들이 한 번쯤 꼭 눈여겨봤으면 하는 것이 있나요?",
      "이 공간을 한 문장으로 소개한다면 어떻게 소개하고 싶으신가요?",
      "이 공간을 떠난 뒤 어떤 마음을 안고 돌아가셨으면 하나요?",
      "방문자에게 꼭 전하고 싶은 한마디가 있다면 무엇인가요?",
    ],
  },
];

async function main() {
  // 안정적인 식별자(episodeNumber unique)로만 EP.1을 찾는다 — 제목 문자열 매칭 금지.
  const template = await prisma.interviewEpisodeTemplate.findUnique({
    where: { episodeNumber: EP1_EPISODE_NUMBER },
    include: { sceneTopics: { include: { questions: true } } },
  });
  if (!template) {
    throw new Error(`episodeNumber=${EP1_EPISODE_NUMBER}인 InterviewEpisodeTemplate을 찾을 수 없습니다.`);
  }

  // 대상 Scene 소재 5개가 전부 존재하는지 먼저 검증 — 일부라도 없으면 엉뚱한 곳에
  // 새로 만들지 않고 즉시 실패한다.
  const sceneTopicByTitle = new Map(template.sceneTopics.map((s) => [s.title, s]));
  const missingTitles = EP1_SCENE_TOPIC_QUESTIONS.filter((set) => !sceneTopicByTitle.has(set.title)).map((set) => set.title);
  if (missingTitles.length > 0) {
    throw new Error(
      `EP.1(${template.id}) 아래에서 다음 Scene 소재를 찾을 수 없습니다: ${missingTitles.join(", ")}. ` +
        `기존 Scene 소재 목록: ${template.sceneTopics.map((s) => s.title).join(", ") || "(없음)"}`
    );
  }

  const beforeCount = template.sceneTopics.reduce((sum, s) => sum + s.questions.length, 0);
  console.log(`EP.1 질문 초기화 전: ${beforeCount}개`);

  await prisma.$transaction(async (tx) => {
    for (const set of EP1_SCENE_TOPIC_QUESTIONS) {
      const sceneTopic = sceneTopicByTitle.get(set.title)!;

      // 소재명은 유지하되, 설명이 스펙과 다르면 맞춰준다(요청 시 "다르면 위 내용으로 맞춰도 된다").
      if (sceneTopic.description !== set.description) {
        await tx.interviewSceneTopic.update({ where: { id: sceneTopic.id }, data: { description: set.description } });
      }

      // 같은 Scene 안에서 질문 중복이 없는지 원본 데이터 자체를 먼저 검증.
      const trimmed = set.questions.map((q) => q.trim());
      const unique = new Set(trimmed);
      if (unique.size !== trimmed.length) {
        throw new Error(`Scene 소재 "${set.title}"의 새 질문 목록에 중복이 있습니다.`);
      }

      await tx.interviewQuestion.deleteMany({ where: { topicId: sceneTopic.id } });

      await tx.interviewQuestion.createMany({
        data: trimmed.map((content, i) => ({ topicId: sceneTopic.id, content, displayOrder: i, isActive: true })),
      });
      console.log(`  ✓ "${set.title}" — 질문 ${trimmed.length}개로 교체`);
    }
  }, { timeout: 30000 });

  const after = await prisma.interviewEpisodeTemplate.findUnique({
    where: { episodeNumber: EP1_EPISODE_NUMBER },
    include: { sceneTopics: { include: { questions: true } } },
  });
  const afterCount = after!.sceneTopics.reduce((sum, s) => sum + s.questions.length, 0);
  console.log("기존 질문 제거 완료");
  console.log(`새 질문 생성: ${afterCount}개`);
  console.log(`EP.1 질문 초기화 후: ${afterCount}개`);

  if (afterCount !== 50) {
    throw new Error(`예상과 다른 최종 질문 수입니다: ${afterCount} (기대값 50)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
