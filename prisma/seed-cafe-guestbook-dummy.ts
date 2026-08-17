/**
 * 운영자 미팅 시연용 — "카페 공간"(slug: buk, 영구 시연 공간, 실제 파일럿 공간 아님) 방명록에만
 * 더미 포스트잇을 채운다. 다른 공간에는 아무 영향이 없다. KPI/월간 리포트 집계도 의도적으로
 * 건드리지 않는다(recomputeSpaceKPI를 호출하지 않음 — 실제 운영 리포트 수치를 오염시키지 않기 위함).
 *
 * 더미 식별: 작성자를 전부 이메일 패턴 "dummy.cafe-demo+NN@spacecube.local"인 신규 User로
 * 생성한다. GuestbookNote/GuestbookReaction 모두 User에 onDelete: Cascade가 걸려 있어서,
 * 이 더미 User들만 지우면 방명록 글/공감이 전부 함께 삭제된다 — cleanup-cafe-guestbook-dummy.ts 참고.
 *
 * idempotent: 매번 실행 시작 시 기존 더미(email prefix로 식별)를 먼저 전부 지우고 새로 채운다
 * (delete-then-recreate) — 반복 실행해도 40 → 80 → 120으로 누적되지 않고 항상 NOTE_COUNT개로 고정된다.
 * 이 공간에 이미 있는 실제(더미 아닌) 포스트잇은 절대 건드리지 않고, 배치 시 충돌 회피 대상(장애물)에만 포함한다.
 *
 * 배치: 무작위 grid가 아니라 postitCollision.ts(findFreePosition)를 실제 방문자 캔버스와 동일한
 * 방식으로 재사용해 서로 겹치지 않게 링 탐색으로 배치한다. 질문 군집 라벨 영역도 장애물로 포함해
 * 라벨과 겹치지 않는다.
 *
 * 실행: npx tsx prisma/seed-cafe-guestbook-dummy.ts (= npm run db:seed-cafe-guestbook-dummy)
 * 삭제: npx tsx prisma/cleanup-cafe-guestbook-dummy.ts (= npm run db:cleanup-cafe-guestbook-dummy)
 */
import { prisma } from "../src/lib/prisma";
import { findFreePosition, clusterLabelRect, POST_IT_WIDTH, POST_IT_HEIGHT, type Rect } from "../src/lib/postitCollision";

const SPACE_SLUG = "buk"; // 카페 공간
const DUMMY_EMAIL_PREFIX = "dummy.cafe-demo+";
const DUMMY_EMAIL_DOMAIN = "spacecube.local";

const NOTE_COUNT = 40;
const DUMMY_USER_COUNT = 43; // NICKNAMES 배열 길이와 동일 — 닉네임은 전역 unique라 중복 배정 방지

// 흩뿌릴 중심 — 이 공간에 이미 실제로 남겨진 포스트잇들의 bounding box 중심(약 3140,3070).
// FREE 군집 라벨(2500,2500)은 이미 그 자체로 fit-to-content 진입 연출([[guestbookViewport]])의
// bounding box 한쪽 끝을 고정하므로, 새로 추가하는 더미는 "이미 정해진 박스 안을 채우는" 방향으로
// 배치해야 화면이 필요 이상으로 축소되지 않는다(밖으로 계속 넓히면 min-scale 하한에 걸려 오히려
// 일부가 화면 밖으로 밀려난다).
const SCATTER_CX = 3140;
const SCATTER_CY = 3070;

// 이 공간(카페 공간)의 Cloudinary에 이미 올라가 있는 실제 이미지를 재사용 — 새 업로드 없음.
const DEMO_IMAGES = [
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783922146/k89yip2tpn64eekijy4x.jpg",
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783922205/luf0geotfjwnhtw16ajq.jpg",
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783922166/b9hg5nuzb0vkisii3vhw.jpg",
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783923428/g236l2wy2lub0zj82mld.jpg",
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783923416/tnwqvp3nwiudjcjkt5ks.jpg",
  "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1783923441/wrl2hmtcdrgs75fzn7bi.jpg",
];

const NICKNAMES = [
  "김도윤", "박서연", "이하은", "최민준", "정지우", "한소율", "윤재현", "임가은",
  "강태오", "오유빈", "신하람", "배지훈", "조은서", "권나윤", "장시우",
  "감성여행자", "커피좋아", "망원산책", "오늘도기록", "혼자여행", "따뜻한하루",
  "조용한오후", "책읽는사람", "여행중독", "카페인중독", "산책러", "늦은오후",
  "잔잔하게", "소소한하루", "오늘의기록", "봄날의커피", "하루한잔", "게으른오후",
  "낯가림", "혼밥러", "노트북유목민", "동네주민", "가끔들르는사람", "커피한잔의여유",
  "글쓰는사람", "오후세시", "느린걸음", "단골예약", "구석자리사랑",
] as const;

// content는 VarChar(80) 제약 — 전부 80자 이내. 공간에 머물며 느낀 짧은 감정/생각/순간 위주로 구성하고,
// 별점·리뷰 플랫폼처럼 들리는 문장(재방문 의사 100%, 굿굿 최고예요 류)은 의도적으로 배제했다.
const MESSAGES = [
  "오늘은 유난히 오래 머물고 싶었어요",
  "창가 자리가 참 좋네요",
  "커피 기다리는 시간까지 좋았습니다",
  "다음에는 책 한 권 들고 오고 싶어요",
  "조용해서 생각 정리하기 좋았어요",
  "오늘 듣던 음악이 기억에 남아요",
  "친구 따라 왔는데 혼자서도 다시 와보고 싶어요",
  "잠깐 쉬었다 가려고 했는데 오래 있었네요",
  "이 공간의 오후가 좋았습니다",
  "오늘의 기분과 잘 어울리는 곳이었어요",
  "혼자 와도 어색하지 않은 공간이었어요",
  "노트북을 오래 펼쳐놓기 좋은 자리였어요",
  "비 오는 소리를 들으며 앉아있었어요",
  "조명이 은은해서 마음이 편해졌어요",
  "사장님 이야기를 읽고 나니 공간이 다르게 보였어요",
  "다음엔 날씨 좋은 날 다시 오고 싶어요",
  "생각보다 오래 머물게 되는 곳이네요",
  "바쁜 하루 중 잠깐의 여유를 찾았어요",
  "창밖을 보며 멍하니 있는 시간이 좋았어요",
  "처음 와봤는데 다음이 기대되는 공간이에요",
  "조용히 책 읽기 딱 좋은 오후였어요",
  "이 공간의 분위기가 오래 기억날 것 같아요",
  "마음이 복잡할 때 다시 찾아오고 싶어요",
  "혼자 있는 시간이 이렇게 편할 줄 몰랐어요",
  "오늘 나눈 이야기가 오래 남을 것 같아요",
  "잔잔한 음악과 잘 어울리는 공간이었어요",
  "다음엔 조금 더 일찍 와서 오래 머물고 싶어요",
  "생각을 정리하러 왔는데 마음까지 정리됐어요",
  "이 자리에 다시 앉고 싶어서 또 올 것 같아요",
  "오늘 하루 중 가장 편안했던 시간이었어요",
  "낯선 동네인데 이상하게 편했어요",
  "우연히 들렀는데 오래 머물게 됐어요",
  "사람 없는 시간에 와서 더 좋았어요",
  "다음 이야기가 궁금해서 또 오게 될 것 같아요",
  "창가 자리에서 바라본 풍경이 좋았어요",
  "시간이 이렇게 빨리 갈 줄 몰랐어요",
  "여기 앉아있으니 생각이 자연스럽게 정리됐어요",
  "조용한 오후를 보내고 싶을 때 또 올게요",
  "오늘 처음 온 곳인데 낯설지 않았어요",
  "이 공간의 이야기를 읽고 나니 애정이 생겼어요",
  "혼자 걷다가 우연히 들어왔는데 좋았어요",
  "다음에는 친구와 함께 오고 싶어요",
  "조금 늦은 시간에 왔는데도 편안했어요",
  "이 공간에서 보낸 시간이 오래 남을 것 같아요",
  "잠시 쉬어가려던 마음이 오래 머무는 마음이 됐어요",
  "오늘 하루의 마침표를 여기서 찍은 기분이에요",
  "다시 올 이유가 하나 더 생겼어요",
] as const;

const CLUSTER_TYPES = ["FREE", "QUESTION_1", "QUESTION_2"] as const;
const CLUSTER_WEIGHTS = [0.55, 0.22, 0.23]; // FREE 비중이 가장 높음(현재 이 공간에서 실제로 보이는 유일한 군집)

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: readonly T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** 대부분 0~2개, 일부 3~5개, 매우 일부 6~8개로 분산되는 공감 수. */
function randomReactionCount(): number {
  const table = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8];
  return pick(table);
}

/** 중심 주변에 밀집/여유 배치가 섞이도록 반경 구간을 가중 샘플링한다. */
function sampleDesiredPoint(): { x: number; y: number } {
  const r = Math.random();
  const [minR, maxR] = r < 0.55 ? [0, 220] : r < 0.85 ? [220, 420] : [420, 620]; // 55% 밀집 / 30% 중간 / 15% 여유
  const angle = Math.random() * Math.PI * 2;
  const radius = randomBetween(minR, maxR);
  return {
    x: SCATTER_CX + Math.cos(angle) * radius,
    y: SCATTER_CY + Math.sin(angle) * radius,
  };
}

async function main() {
  const space = await prisma.space.findUnique({ where: { slug: SPACE_SLUG } });
  if (!space) throw new Error(`space slug="${SPACE_SLUG}" 를 찾을 수 없습니다 — 안전을 위해 중단합니다.`);

  const activeSession = await prisma.guestbookSession.findFirst({
    where: { spaceId: space.id, status: "ACTIVE" },
  });
  if (!activeSession) throw new Error(`space "${space.name}"에 ACTIVE 방명록 세션이 없습니다 — 안전을 위해 중단합니다.`);

  // ── 0) idempotent 리셋 — 기존 더미(이 접두사로 식별되는 User)만 먼저 전부 지운다.
  //     GuestbookNote/GuestbookReaction은 User onDelete:Cascade로 함께 삭제된다.
  const existingDummy = await prisma.user.findMany({
    where: { email: { startsWith: DUMMY_EMAIL_PREFIX } },
    select: { id: true },
  });
  if (existingDummy.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: existingDummy.map((u) => u.id) } } });
    console.log(`기존 더미 유저 ${existingDummy.length}명(및 연결된 포스트잇/공감) 정리 완료`);
  }

  // ── 1) 더미 작성자 User 생성 ─────────────────────────────────────
  const userCount = Math.min(DUMMY_USER_COUNT, NICKNAMES.length); // 닉네임이 전역 unique라 배열 길이를 넘지 않는다
  const users = [];
  for (let i = 0; i < userCount; i++) {
    const email = `${DUMMY_EMAIL_PREFIX}${String(i + 1).padStart(2, "0")}@${DUMMY_EMAIL_DOMAIN}`;
    const nickname = NICKNAMES[i];
    const user = await prisma.user.create({ data: { email, name: nickname, nickname } });
    users.push(user);
  }
  console.log(`더미 작성자 ${users.length}명 생성 완료`);

  // ── 2) 충돌 회피용 장애물 — 이 공간에 이미 있는(더미 아닌 실제) 포스트잇 + 군집 라벨 3개.
  //     실제 포스트잇은 절대 이동/삭제하지 않고, 새 더미를 그 옆에 안전하게 배치하는 데만 쓴다.
  const existingNotes = await prisma.guestbookNote.findMany({
    where: { spaceId: space.id, deletedAt: null },
    select: { x: true, y: true },
  });
  const obstacles: Rect[] = [
    ...existingNotes.map((n) => ({ x: n.x, y: n.y, width: POST_IT_WIDTH, height: POST_IT_HEIGHT })),
    clusterLabelRect({ x: activeSession.freeClusterX, y: activeSession.freeClusterY }),
    clusterLabelRect({ x: activeSession.question1ClusterX, y: activeSession.question1ClusterY }),
    clusterLabelRect({ x: activeSession.question2ClusterX, y: activeSession.question2ClusterY }),
  ];

  // ── 3) 방명록 포스트잇 생성 — postitCollision.findFreePosition으로 실제 캔버스와 동일한 방식으로 배치 ──
  const now = Date.now();
  let skipped = 0;

  for (let i = 0; i < NOTE_COUNT; i++) {
    const author = users[i % users.length];
    const content = pick(MESSAGES);
    const hasImage = Math.random() < 0.3;
    const clusterType = weightedPick(CLUSTER_TYPES, CLUSTER_WEIGHTS);

    const desiredCenter = sampleDesiredPoint();
    const desired = { x: desiredCenter.x - POST_IT_WIDTH / 2, y: desiredCenter.y - POST_IT_HEIGHT / 2 };
    const found = findFreePosition(desired, POST_IT_WIDTH, POST_IT_HEIGHT, obstacles);
    if (!found) {
      skipped++;
      continue; // 이 근방이 이미 가득 찼으면 억지로 욱여넣지 않고 건너뛴다(다음 후보 좌표로)
    }

    // 최근 며칠~약 3주 전 사이에 자연스럽게 분산(최근일수록 조금 더 많이 몰리도록 제곱 가중)
    const daysAgo = Math.pow(Math.random(), 1.5) * 21;
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - randomBetween(0, 24 * 60 * 60 * 1000));

    const note = await prisma.guestbookNote.create({
      data: {
        userId: author.id,
        spaceId: space.id,
        guestbookSessionId: activeSession.id,
        recordId: null,
        clusterType,
        content,
        nickname: author.nickname,
        imageUrl: hasImage ? pick(DEMO_IMAGES) : null,
        x: found.x,
        y: found.y,
        rotation: randomBetween(-4, 4),
        scale: 1,
        color: "#F6E7A8",
        createdAt,
        updatedAt: createdAt,
      },
    });
    obstacles.push({ x: found.x, y: found.y, width: POST_IT_WIDTH, height: POST_IT_HEIGHT });

    // ── 4) 공감 랜덤 부여(작성자 본인 제외, 서로 다른 더미 유저) ──────────
    const reactionCount = randomReactionCount();
    if (reactionCount > 0) {
      const reactors = users.filter((u) => u.id !== author.id).sort(() => Math.random() - 0.5).slice(0, reactionCount);
      await prisma.guestbookReaction.createMany({
        data: reactors.map((r) => ({ postId: note.id, userId: r.id, createdAt: note.createdAt })),
        skipDuplicates: true,
      });
    }
  }

  const created = NOTE_COUNT - skipped;
  console.log(`포스트잇 ${created}개 생성 완료${skipped > 0 ? ` (${skipped}개는 근방이 가득 차 건너뜀)` : ""}`);
  console.log("정리: npx tsx prisma/cleanup-cafe-guestbook-dummy.ts");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
