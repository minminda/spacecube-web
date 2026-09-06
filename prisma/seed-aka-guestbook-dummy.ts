/**
 * 한이음 시연 영상 촬영용 — "아카커피룸"(slug: aka-coffee-room, 실제 운영 중인 파일럿 공간)
 * 방명록에만 더미 포스트잇을 채운다. 다른 공간에는 아무 영향이 없다.
 *
 * buk(카페 공간) 더미 스크립트(seed-cafe-guestbook-dummy.ts)의 구조를 그대로 재사용한다:
 * - 더미 식별: 작성자를 전부 이메일 패턴 "dummy.aka-demo+NN@spacecube.local"인 신규 User로 생성.
 *   GuestbookNote/GuestbookReaction 모두 User에 onDelete: Cascade가 걸려 있어서, 이 더미 User들만
 *   지우면 방명록 글/공감이 전부 함께 삭제된다 — cleanup-aka-guestbook-dummy.ts 참고.
 * - idempotent: 매번 실행 시작 시 기존 더미(email prefix로 식별)를 먼저 전부 지우고 새로 채운다
 *   (delete-then-recreate) — 반복 실행해도 계속 누적되지 않고 항상 NOTE_COUNT개로 고정된다.
 *   이 공간에 이미 있는 실제(더미 아닌) 포스트잇은 절대 건드리지 않고, 배치 시 충돌 회피 대상
 *   (장애물)에만 포함한다.
 * - recordId는 항상 null — 가짜 Record를 만들지 않는다. GuestbookNote.@@unique([userId,
 *   guestbookSessionId, recordId])는 Postgres에서 NULL끼리 서로 충돌하지 않으므로 문제 없다.
 * - 배치: postitCollision.ts(findFreePosition)를 실제 방문자 캔버스와 동일한 방식으로 재사용해
 *   서로 겹치지 않게 링 탐색으로 배치한다.
 *
 * buk과 다른 점 — 이 공간은 3개 군집(FREE/QUESTION_1/QUESTION_2) 라벨 좌표가 서로 멀리 떨어져
 * 있어(화면 전체에 넓게 분산), buk처럼 단일 중심점 근처에만 흩뿌리면 질문별 영역 구조가 무시되고
 * 화면 한쪽에만 몰린다. 그래서 이 스크립트는 각 포스트잇의 clusterType에 맞는 실제 군집 중심
 * (session.freeClusterX/Y 등) 근처에 흩뿌리도록 sampleDesiredPoint를 군집별로 분리했다.
 *
 * ⚠️ KPI 참고: recomputeSpaceKPI(src/lib/kpi.ts)는 admin 계정만 제외하고 dummy 여부는 구분하지
 * 않는다 — 더미가 존재하는 동안 이 공간에 실제 Record/방명록 글이 새로 생기거나 관리자가
 * /admin/[id]/report를 열면 그 날짜의 SpaceKPI 스냅샷 중 "총 방명록 수/참여자 수/참여율"이
 * 일시적으로 부풀 수 있다(사용자 승인 하에 감수). 방문자수/QR스캔수/재방문율/취향데이터는 가짜
 * Record/SpaceScan을 만들지 않으므로 전혀 영향 없다. 촬영 종료 후 cleanup 스크립트 실행 +
 * 리포트 페이지를 한 번 다시 열면(재계산 트리거) 다음 스냅샷부터 자동으로 원상복구된다(잔존 없음).
 *
 * 실행: npx tsx prisma/seed-aka-guestbook-dummy.ts (= npm run db:seed-aka-guestbook-dummy)
 * 삭제: npx tsx prisma/cleanup-aka-guestbook-dummy.ts (= npm run db:cleanup-aka-guestbook-dummy)
 */
import { prisma } from "../src/lib/prisma";
import { hasCollision, clusterLabelRect, POST_IT_WIDTH, POST_IT_HEIGHT, type Rect, type Point } from "../src/lib/postitCollision";
import { WORLD_W, WORLD_H } from "../src/app/space/[slug]/guestbook/canvasConstants";

// 실제 방문자 포스트잇 작성 시 서버가 적용하는 것과 동일한 캔버스 경계(GuestbookCanvas.tsx의
// desiredX/Y clamp 공식) — 이걸 지키지 않으면 더미가 5000×5000 월드 바깥에 생성되어 캔버스에서
// 아예 안 보이는 위치에 놓일 수 있다.
const MIN_X = 40;
const MAX_X = WORLD_W - POST_IT_WIDTH - 40;
const MIN_Y = 40;
const MAX_Y = WORLD_H - 220;

const SPACE_SLUG = "aka-coffee-room"; // 아카커피룸
const DUMMY_EMAIL_PREFIX = "dummy.aka-demo+";
const DUMMY_EMAIL_DOMAIN = "spacecube.local";

const NOTE_COUNT = 70; // 목표 개수 — 밀도가 높아질수록 findFreePositionInBounds가 자리를 못 찾아 일부는 건너뛴다(실제 생성 개수는 로그로 확인)
const DUMMY_USER_COUNT = 50;

// buk의 NICKNAMES(43개)와 절대 겹치지 않는 새 이름 풀 — nickname은 전역 @unique라 겹치면 즉시 실패한다.
const NICKNAMES = [
  "이서준", "박지안", "김하윤", "정예은", "최시온", "한도현", "윤소이", "임채원",
  "강은우", "오하람", "신유주", "배승민", "조아린", "권다인",
  "조용한아침", "말없이앉아", "혼자만의시간", "커피향기가득", "느긋한오후", "창가체질",
  "장하늘", "문지호", "유서아", "백승우", "나은채", "서지민", "황도윤", "표승아",
  "안유진", "구민재", "홍서율", "차은우",
  "마시멜로우", "여름밤바람", "조각모음", "잠깐앉음", "오후네시반", "발걸음가벼이",
  "하늘보는중", "조명아래", "책한장", "노래흥얼", "걷다가들름", "커피한모금",
  "창밖풍경", "잔잔한하루", "오늘의한잔", "늦은아침형", "소란없이", "고요한자리",
] as const;

// content는 VarChar(80) 제약 — 전부 80자 이내. 별점/리뷰 플랫폼처럼 들리는 과장 문구
// ("인생 카페", "무조건 재방문" 등)는 배제하고, 공간에 머물며 든 짧은 감정/생각 위주로 구성.
const FREE_MESSAGES = [
  "조용히 머물다 가기 좋았어요",
  "음악이 공간이랑 잘 어울려요",
  "혼자 와도 편한 곳이에요",
  "커피 마시면서 오래 있고 싶은 자리였어요",
  "생각보다 더 차분한 공간이네요",
  "창가 자리에 앉아 한참 있었어요",
  "조명이 은은해서 마음이 편해졌어요",
  "노트북 펼치기 좋은 테이블이었어요",
  "커피 향이 오래 남는 곳이에요",
  "잠깐 들렀는데 오래 머물렀어요",
  "바쁜 하루 중 여유를 찾은 시간이었어요",
  "다음엔 조금 더 일찍 와보고 싶어요",
  "사람 많지 않은 시간에 와서 좋았어요",
  "조용한 대화 나누기 좋은 곳이었어요",
  "혼자 책 읽기 딱 좋았어요",
  "오늘 하루 중 가장 편안한 시간이었어요",
  "우연히 들렀는데 계속 생각나는 곳이에요",
  "생각을 정리하기에 좋은 자리였어요",
  "가만히 앉아있는 시간이 좋았어요",
  "오늘따라 발걸음이 여기로 향했어요",
  "조용한 오후를 보내고 싶을 때 다시 올게요",
  "낯선 동네인데 편안했어요",
  "천천히 흘러가는 시간이 좋았어요",
  "창밖 풍경을 한참 바라봤어요",
  "혼자 있는 시간이 편했어요",
  "적당한 소음이 오히려 집중을 도왔어요",
  "커피 한 모금에 하루가 정리되는 기분이었어요",
  "다음에도 이 자리에 앉고 싶어요",
] as const;

// GuestbookSession.question1 = "오늘, 당신의 행복은 무엇인가요?" 답변형 문장.
const QUESTION1_MESSAGES = [
  "따뜻한 커피 한 잔이면 충분해요",
  "오늘은 그냥 여기 앉아있는 것 자체가 행복이었어요",
  "좋아하는 사람과 나눈 대화요",
  "아무 약속 없는 오후였어요",
  "좋아하는 노래가 흘러나올 때요",
  "혼자만의 조용한 시간이요",
  "일 끝내고 마시는 커피 한 잔이요",
  "햇살 좋은 창가 자리에 앉는 거요",
  "오랜만에 느긋하게 걷다가 들어온 이 시간이요",
  "별거 아닌 하루가 편안했다는 것 자체요",
  "오늘 하루 무사히 지나간 것이요",
  "좋아하는 책 한 페이지 넘기는 시간이요",
  "특별한 일 없이 지나가는 오후요",
  "누군가와 나눈 짧은 안부요",
  "커피 냄새가 퍼지는 이 순간이요",
  "혼자 걷다가 마주친 여유로운 시간이요",
  "날씨가 좋았던 것만으로도 충분했어요",
  "잠깐이라도 쉬어가는 이 시간이요",
] as const;

// GuestbookSession.question2 = "공간에서 처음 느낀 감정은 무엇인가요?" 답변형 문장.
const QUESTION2_MESSAGES = [
  "생각보다 조용해서 놀랐어요",
  "들어오자마자 마음이 편해졌어요",
  "은은한 향이 먼저 느껴졌어요",
  "낯설지 않고 편안한 느낌이었어요",
  "따뜻한 분위기에 긴장이 풀렸어요",
  "조용한 음악이 먼저 귀에 들어왔어요",
  "포근한 조명이 인상 깊었어요",
  "차분한 공기가 좋았어요",
  "안정감이 먼저 느껴지는 곳이었어요",
  "생각보다 아늑해서 좋았어요",
  "생각보다 편안한 온도였어요",
  "조용한 분위기에 마음이 놓였어요",
  "따뜻한 색감이 먼저 눈에 들어왔어요",
  "차분한 첫인상이었어요",
  "예상보다 아늑한 느낌이었어요",
  "부드러운 조명이 인상적이었어요",
  "생각보다 넓어서 놀랐어요",
  "은은한 음악에 긴장이 풀렸어요",
] as const;

const CLUSTER_TYPES = ["FREE", "QUESTION_1", "QUESTION_2"] as const;
type ClusterTypeLiteral = (typeof CLUSTER_TYPES)[number];
const CLUSTER_WEIGHTS = [0.4, 0.3, 0.3]; // 화면 한쪽에만 몰리지 않도록 세 군집에 고르게 분산

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

/**
 * 문구 풀을 매번 무작위로 pick하면 50개를 채울 때 같은 문장이 눈에 띄게 반복된다.
 * 그래서 풀을 섞은 뒤 순서대로 소비하고, 다 쓰면 다시 섞어서 채우는 "셔플 큐"로 바꿔
 * 같은 군집 안에서 문장이 겹치는 빈도를 최소화한다(풀 크기를 다 쓰기 전까지는 중복 없음).
 */
function makeShuffleCycler<T>(pool: readonly T[]): () => T {
  let queue: T[] = [];
  return () => {
    if (queue.length === 0) queue = [...pool].sort(() => Math.random() - 0.5);
    return queue.pop() as T;
  };
}

/** 지정한 군집 중심 주변에 밀집/여유 배치가 섞이도록 반경 구간을 가중 샘플링한다. */
function sampleDesiredPoint(center: Point): Point {
  const r = Math.random();
  const [minR, maxR] = r < 0.55 ? [0, 260] : r < 0.85 ? [260, 500] : [500, 750]; // 55% 밀집 / 30% 중간 / 15% 여유 — 50개를 채우려면 buk 대비 반경을 넓혀야 한다
  const angle = Math.random() * Math.PI * 2;
  const radius = randomBetween(minR, maxR);
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

/**
 * postitCollision.ts의 findFreePosition(사각 링 탐색)은 캔버스 월드 경계를 모르기 때문에,
 * 좌표를 그대로 넘기면 clamp된 desired 지점에서 바깥쪽으로 탐색하다 5000×5000 월드 밖으로
 * 나가버릴 수 있다(실제로 이 버그를 시드 후 좌표 검증에서 발견함). 그래서 여기서는 같은
 * hasCollision 판정 함수를 재사용하되, 후보 좌표를 매번 캔버스 경계 안으로 clamp한 뒤
 * 충돌을 검사하는 무작위 재시도 방식으로 대체한다 — 항상 [MIN_X,MAX_X]×[MIN_Y,MAX_Y] 안에서만
 * 결과를 반환한다(운영 코드인 postitCollision.ts 자체는 수정하지 않는다).
 */
function findFreePositionInBounds(center: Point, width: number, height: number, obstacles: Rect[]): Point | null {
  for (let attempt = 0; attempt < 250; attempt++) {
    const raw = attempt === 0 ? center : sampleDesiredPoint(center);
    const candidate = {
      x: Math.min(Math.max(raw.x - width / 2, MIN_X), MAX_X),
      y: Math.min(Math.max(raw.y - height / 2, MIN_Y), MAX_Y),
    };
    if (!hasCollision({ x: candidate.x, y: candidate.y, width, height }, obstacles)) return candidate;
  }
  return null;
}

async function main() {
  const space = await prisma.space.findUnique({ where: { slug: SPACE_SLUG } });
  if (!space) throw new Error(`space slug="${SPACE_SLUG}" 를 찾을 수 없습니다 — 안전을 위해 중단합니다.`);

  const activeSession = await prisma.guestbookSession.findFirst({
    where: { spaceId: space.id, status: "ACTIVE" },
  });
  if (!activeSession) throw new Error(`space "${space.name}"에 ACTIVE 방명록 세션이 없습니다 — 안전을 위해 중단합니다.`);

  const clusterCenters: Record<ClusterTypeLiteral, Point> = {
    FREE: { x: activeSession.freeClusterX, y: activeSession.freeClusterY },
    QUESTION_1: { x: activeSession.question1ClusterX, y: activeSession.question1ClusterY },
    QUESTION_2: { x: activeSession.question2ClusterX, y: activeSession.question2ClusterY },
  };

  const messageCyclers: Record<ClusterTypeLiteral, () => string> = {
    FREE: makeShuffleCycler(FREE_MESSAGES),
    QUESTION_1: makeShuffleCycler(QUESTION1_MESSAGES),
    QUESTION_2: makeShuffleCycler(QUESTION2_MESSAGES),
  };

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
    clusterLabelRect(clusterCenters.FREE),
    clusterLabelRect(clusterCenters.QUESTION_1),
    clusterLabelRect(clusterCenters.QUESTION_2),
  ];

  // ── 3) 방명록 포스트잇 생성 — postitCollision.findFreePosition으로 실제 캔버스와 동일한 방식으로 배치 ──
  const now = Date.now();
  let skipped = 0;

  for (let i = 0; i < NOTE_COUNT; i++) {
    const author = users[i % users.length];
    const clusterType = weightedPick(CLUSTER_TYPES, CLUSTER_WEIGHTS);
    const content = messageCyclers[clusterType]();
    // ENABLE_GUESTBOOK_IMAGE pilot flag/GuestbookSettings.allowImage 상태가 이 환경에서 불확실해
    // (로컬 .env 미설정, Vercel 배포 환경변수는 확인 불가) 촬영 시 깨져 보일 위험을 피하려고
    // 이미지 없는 텍스트 포스트잇만 생성한다.

    const found = findFreePositionInBounds(clusterCenters[clusterType], POST_IT_WIDTH, POST_IT_HEIGHT, obstacles);
    if (!found) {
      skipped++;
      continue; // 이 근방이 이미 가득 찼으면 억지로 욱여넣지 않고 건너뛴다(다음 후보 좌표로)
    }

    // 최근 1~14일 사이에 자연스럽게 분산(최근일수록 조금 더 많이 몰리도록 제곱 가중) —
    // 실제 운영 중인 공간이라 buk(영구 시연 공간, 최대 21일)보다 짧게 잡아 "최근 방문자 흔적"처럼 보이게 한다.
    const daysAgo = Math.pow(Math.random(), 1.5) * 14;
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
        imageUrl: null,
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
  console.log("정리: npx tsx prisma/cleanup-aka-guestbook-dummy.ts");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
