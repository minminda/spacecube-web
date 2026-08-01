/**
 * 소개서 촬영/서비스 시연용 — "카페 공간"(slug: buk) 방명록에만 더미 포스트잇을 채운다.
 * 다른 공간에는 아무 영향이 없다. KPI/월간 리포트 집계도 의도적으로 건드리지 않는다
 * (recomputeSpaceKPI를 호출하지 않음 — 실제 운영 리포트 수치를 오염시키지 않기 위함).
 *
 * 더미 식별: 작성자를 전부 이메일 패턴 "dummy.cafe-demo+NN@spacecube.local"인 신규 User로
 * 생성한다. GuestbookNote/GuestbookReaction 모두 User에 onDelete: Cascade가 걸려 있어서,
 * 이 더미 User들만 지우면 방명록 글/공감이 전부 함께 삭제된다 — cleanup-cafe-guestbook-dummy.ts 참고.
 *
 * 실행: npx tsx prisma/seed-cafe-guestbook-dummy.ts
 * 삭제: npx tsx prisma/cleanup-cafe-guestbook-dummy.ts
 */
import { prisma } from "../src/lib/prisma";

const SPACE_ID = "cmn2r2bb80001nulw7jxoioxv"; // 카페 공간 (slug: buk)
const ACTIVE_SESSION_ID = "cmriz5cyo0013zj99y2jgqdcw"; // 현재 진행 중인 방명록 세션
const DUMMY_EMAIL_DOMAIN = "spacecube.local";
const DUMMY_EMAIL_PREFIX = "dummy.cafe-demo+";

const NOTE_COUNT = 72;
const DUMMY_USER_COUNT = 45;

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

// content는 VarChar(80) 제약 — 전부 80자 이내. 짧은 한 줄부터 긴 문장까지 섞는다.
const MESSAGES = [
  "여기 진짜 좋아요",
  "또 오고 싶어요",
  "분위기 최고",
  "커피 맛있어요",
  "혼자 오기 좋아요",
  "조용해서 좋았어요",
  "잘 쉬다 갑니다",
  "다음에 또 올게요",
  "사장님 감사해요",
  "좋은 시간이었어요",
  "여기 최애 카페",
  "힐링하고 갑니다",
  "너무 좋았어요 진짜",
  "편안한 하루였어요",
  "굿굿 최고예요",
  "재방문 의사 100%",
  "오길 잘했다",
  "다음 주에 또 올래요",
  "커피도 좋았지만 공간 분위기가 오래 기억에 남네요",
  "사장님 이야기를 읽고 나니까 공간이 다르게 보였어요",
  "혼자 와도 편하게 머물 수 있었어요",
  "조용히 쉬어가기 좋은 공간이었습니다",
  "다음에 친구랑 다시 오고 싶어요",
  "읽고 나니 왜 이런 인테리어인지 이해됐어요",
  "생각보다 훨씬 아늑해서 놀랐어요",
  "노트북 들고 오래 앉아있기 좋아요",
  "창가 자리가 특히 마음에 들었어요",
  "음악 선곡도 너무 좋았어요",
  "은은한 조명이 마음을 편하게 해줬어요",
  "우연히 들렀는데 단골 될 것 같아요",
  "책 읽으러 다시 와야겠어요",
  "직원분들이 다 친절하셨어요",
  "생각 정리하기 딱 좋은 공간이에요",
  "느긋하게 오후를 보내고 갑니다",
  "인스타에서 보고 왔는데 실물이 더 좋아요",
  "향이 좋아서 계속 앉아있었어요",
  "비 오는 날 오니까 더 좋았어요",
  "혼자만의 시간이 필요할 때 또 올게요",
  "생각보다 자리가 편해서 오래 있었어요",
  "이야기를 읽고 나서 공간을 다시 둘러보니 왜 이런 선택을 했는지 알 것 같았어요",
  "처음엔 그냥 카페인 줄 알았는데 알고 보니 훨씬 깊은 이야기가 있는 곳이었네요",
  "혼자 조용히 시간을 보내고 싶을 때 자주 생각날 것 같은 공간입니다",
  "사장님이 공간을 대하는 마음이 느껴져서 커피가 더 맛있게 느껴졌어요",
  "친구 소개로 왔는데 왜 자꾸 여기 얘기를 했는지 이제 알겠어요",
  "바쁜 하루 중에 여기 앉아있는 시간만큼은 정말 여유로웠어요",
  "다음엔 날씨 좋은 날 다시 와서 창가 자리에 앉아보고 싶어요",
  "일 때문에 지쳐있었는데 여기 앉아있으니까 좀 풀리는 느낌이었어요",
  "메뉴판 보다가 사장님 취향이 느껴져서 웃음이 났어요",
  "2번째 방문인데 올 때마다 좋아지는 공간이에요",
  "동네에 이런 곳이 있는 줄 몰랐어요, 자주 올게요",
] as const;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** [0,1,2,5,8,13,21] 예시처럼 작은 값에 더 무게를 둔 랜덤 공감 수. */
function randomReactionCount(): number {
  const table = [0, 0, 1, 1, 1, 2, 2, 5, 5, 8, 8, 13, 21];
  return pick(table);
}

async function main() {
  // ── 1) 더미 작성자 User 생성 ─────────────────────────────────────
  const users = [];
  for (let i = 0; i < DUMMY_USER_COUNT; i++) {
    const email = `${DUMMY_EMAIL_PREFIX}${String(i + 1).padStart(2, "0")}@${DUMMY_EMAIL_DOMAIN}`;
    const nickname = NICKNAMES[i % NICKNAMES.length];
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: nickname, nickname },
    });
    users.push(user);
  }
  console.log(`더미 작성자 ${users.length}명 준비 완료`);

  // ── 2) 방명록 포스트잇 생성 ────────────────────────────────────────
  const now = Date.now();
  const centerX = 2500;
  const centerY = 2500;

  for (let i = 0; i < NOTE_COUNT; i++) {
    const author = pick(users);
    const content = pick(MESSAGES);
    const hasImage = Math.random() < 0.3;

    // 중심(2500,2500) 주변 반경 400~2200 사이에 흩뿌리듯 배치 — 완전한 원이 아니도록 지터를 더한다.
    const angle = Math.random() * Math.PI * 2;
    const radius = randomBetween(400, 2200);
    const x = centerX + Math.cos(angle) * radius + randomBetween(-150, 150);
    const y = centerY + Math.sin(angle) * radius + randomBetween(-150, 150);

    // 최근 며칠~약 3주 전 사이에 자연스럽게 분산 (최근일수록 조금 더 많이 몰리도록 제곱 가중)
    const daysAgo = Math.pow(Math.random(), 1.5) * 21;
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - randomBetween(0, 24 * 60 * 60 * 1000));

    const note = await prisma.guestbookNote.create({
      data: {
        userId: author.id,
        spaceId: SPACE_ID,
        guestbookSessionId: ACTIVE_SESSION_ID,
        recordId: null,
        content,
        nickname: author.nickname,
        imageUrl: hasImage ? pick(DEMO_IMAGES) : null,
        x, y,
        rotation: randomBetween(-4, 4),
        scale: 1,
        color: "#F6E7A8",
        createdAt,
        updatedAt: createdAt,
      },
    });

    // ── 3) 공감 랜덤 부여 (작성자 본인 제외, 서로 다른 더미 유저) ──────────
    const reactionCount = randomReactionCount();
    if (reactionCount > 0) {
      const reactors = users.filter((u) => u.id !== author.id).sort(() => Math.random() - 0.5).slice(0, reactionCount);
      await prisma.guestbookReaction.createMany({
        data: reactors.map((r) => ({ postId: note.id, userId: r.id, createdAt: note.createdAt })),
        skipDuplicates: true,
      });
    }
  }

  console.log(`포스트잇 ${NOTE_COUNT}개 생성 완료`);
  console.log("정리: npx tsx prisma/cleanup-cafe-guestbook-dummy.ts");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
