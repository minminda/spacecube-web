/**
 * 방명록 UI 검증용 샘플 — 활성 Cube 공간(Space.isActive && !isDemo, ACTIVE 방명록 세션이 있는 곳)마다 8~11개.
 *   npx tsx --env-file=.env scripts/seed-sample-guestbook.ts            미리보기(DB 변경 없음)
 *   npx tsx --env-file=.env scripts/seed-sample-guestbook.ts --apply    샘플 만들기(몇 번 실행해도 같은 개수 — 기존 샘플을 지우고 다시 만든다)
 *   npx tsx --env-file=.env scripts/seed-sample-guestbook.ts --cleanup  지울 개수 미리보기 / --cleanup --yes 로 샘플과 샘플 작성자 계정만 지우기
 *
 * 실제 참여 데이터와 완전히 분리한다(스키마 추가 없음 — 기존 더미 계정 정책 src/lib/demoData.ts 재사용):
 *   - 작성자는 샘플 전용 더미 계정 하나(User.isDemo, 이메일 sample-guestbook@spacecube.local). 가짜 사용자를 여럿 만들지 않는다.
 *   - 더미 계정 글이라 실제 공간의 방문자 화면 · 운영자 화면 · KPI · 월간 리포트 · 퍼널 · 추천 · 공개 프로필에서 빠지고,
 *     관리자 · 로컬 개발 미리보기 캔버스에서만 "샘플" 표시로 보인다(관리자 방명록 목록에는 SAMPLE).
 *   - Record · 공감 · 댓글 · 퍼널 이벤트는 만들지 않는다(가짜 참여 없음). recomputeSpaceKPI도 부르지 않는다.
 *   - 실제 글은 읽기만 한다(배치할 때 겹치지 않게 피하는 장애물로만). 수정 · 삭제하는 건 이 작성자의 글뿐.
 * 문장은 각 공간의 실제 방명록 질문(현재 ACTIVE 세션)과 그 공간 이야기(Episode)에 맞춰 썼고, 공간에 대한 새 사실은 만들지 않는다.
 * 질문이 바뀌어 아래 표와 다르면 그 공간은 건너뛴다(엉뚱한 질문 밑에 샘플이 붙지 않게).
 */
import { PrismaClient, type ClusterType } from "@prisma/client";
import { findFreePosition, clusterLabelRect, POST_IT_WIDTH, POST_IT_HEIGHT, type Rect } from "../src/lib/postitCollision";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const CLEANUP = process.argv.includes("--cleanup");

const AUTHOR_EMAIL = "sample-guestbook@spacecube.local";
const AUTHOR_NICKNAME = "방명록샘플";
/** 포스트잇 아래 이름 — 실제 방문자처럼 보이지 않게 모두 같은 표시 */
const NOTE_NICKNAME = "샘플";
const MAX_LEN = 80; // GuestbookNote.content VarChar(80)

type Notes = Partial<Record<ClusterType, string[]>>;

/** 공간별: 확인용 질문(현재 세션과 같아야 실행) + 군집별 샘플 문장(짧음 · 중간 · 2~3문장, 말투 섞음) */
const SAMPLES: Record<string, { q1: string | null; q2: string | null; notes: Notes }> = {
  "booknook-yeonnam": {
    q1: "요즘 고민은 무엇인가요?",
    q2: "다시금 힘을 낼 수 있는 나만의 방법은 무엇인가요?",
    notes: {
      QUESTION_1: [
        "이직을 할지 말지.",
        "하고 싶은 일과 잘하는 일 사이에서 아직 고르는 중이에요.",
        "요즘은 쉬는 법을 잊어버린 것 같아요. 여기서 한 시간 동안 아무것도 안 하다가 그게 고민이었구나 했습니다.",
      ],
      QUESTION_2: [
        "좋아하는 책 첫 장 다시 읽기",
        "혼자 조용한 곳에 앉아 있기. 오늘처럼요.",
        "산책하고 따뜻한 차 한 잔. 생각보다 별거 아닌 게 힘이 되더라고요.",
        "일기를 써요. 잘 안 풀린 날도 한 줄은 남겨두면 다음 날 조금 덜 무거워요.",
      ],
      FREE: [
        "조용히 책 읽다가 갑니다.",
        "꼭 책을 읽지 않아도 괜찮다는 말이 좋았어요. 오늘은 창밖만 오래 봤어요.",
      ],
    },
  },
  "inner-discovery": {
    q1: "어떤 시간을 가지셨나요?",
    q2: "어떤 커피를 드셨나요?",
    notes: {
      QUESTION_1: [
        "생각 정리하는 시간",
        "오랜만에 휴대폰을 거의 안 보고 앉아 있었어요.",
        "커피 한 잔 마시는 동안 나에 대해 생각해봤어요. 거창하진 않았지만 그래서 좋았습니다.",
        "친구랑 왔는데 서로 말없이 각자 시간을 보냈다. 그게 어색하지 않았음",
      ],
      QUESTION_2: [
        "따뜻한 라떼",
        "산미 있는 핸드드립이요. 천천히 마시기 좋았어요.",
        "아이스 아메리카노. 날이 덥진 않았는데 그냥 시원한 게 마시고 싶었어요.",
      ],
      FREE: [
        "사라진 다리 이야기를 읽고 나니 동네가 조금 다르게 보이네요.",
        "남이 보는 나와 내가 보는 나 사이. 오늘은 그 사이를 조금 걸어본 기분이에요.",
        "다음엔 혼자 와볼게요",
      ],
    },
  },
  "turndown-service": {
    q1: "좋아하는 음악이 있나요?",
    q2: null,
    notes: {
      QUESTION_1: [
        "재즈 피아노",
        "비 오는 날엔 오래된 가요를 들어요. 여기서 LP로 들으니 더 좋았어요.",
        "요즘은 가사 없는 음악만 들어요. 생각할 틈이 생겨서요.",
        "아빠가 듣던 노래를 여기서 우연히 들었어요. 제목은 몰라도 멜로디는 기억나더라고요. 반가웠습니다.",
        "시티팝!",
      ],
      FREE: [
        "음악 들으면서 책 반 권 읽고 갑니다.",
        "판 바뀌는 소리까지 좋았어요",
        "조용히 음악 듣다 가기 좋은 곳이에요. 다음엔 좋아하는 앨범이 있는지 여쭤볼게요.",
      ],
    },
  },
  dasijeom: {
    q1: "이곳에서 문득 떠오른 사람이 있나요?",
    q2: "요즘 나를 가장 나답게 만드는 것이 있나요?",
    notes: {
      QUESTION_1: [
        "엄마",
        "같이 영화 보던 친구가 떠올랐어요. 연락 한번 해봐야겠어요.",
        "아버지와 다시 찾아왔다는 이야기를 읽고 저도 아빠 생각이 났습니다. 이번 주말엔 전화드리려고요.",
      ],
      QUESTION_2: [
        "아침 산책",
        "좋아하는 영화를 몇 번이고 다시 보는 것. 볼 때마다 다른 장면이 남아요.",
        "필름 카메라요. 다 찍고 나서야 뭘 찍었는지 알게 되는 게 좋아요.",
      ],
      FREE: [
        "취향을 발견하는 게 나를 발견하는 일이라는 말, 오래 기억할 것 같아요.",
        "오늘은 시선을 안쪽으로 돌려본 날",
        "생각보다 오래 머물렀어요. 창가 자리가 특히 좋았습니다.",
      ],
    },
  },
  nokhwabutton: {
    q1: "당신은 언제 녹화버튼을 누르시나요?",
    q2: "촬영 후, 나에게 어떤 경험이 좋았나요?",
    notes: {
      QUESTION_1: [
        "아이가 웃을 때",
        "여행 첫날 아침이요. 아직 아무 일도 안 일어났을 때가 제일 설레서요.",
        "친구들이랑 별 얘기 안 할 때. 나중에 보면 그런 장면이 제일 좋더라고요.",
        "노을 질 때 꼭 눌러요",
      ],
      QUESTION_2: [
        "다시 보니까 그날 공기까지 기억났어요.",
        "화질이 선명하지 않아서 오히려 좋았어요. 기억이랑 비슷한 느낌이라서요.",
        "찍을 땐 몰랐는데 영상 속 내 목소리가 꽤 즐거워 보였다. 그날 좋았구나 싶음",
      ],
      FREE: [
        "캠코더 고르는 데 한참 걸렸어요. 모델명 대신 감상이 적혀 있어서 고르기 편했습니다.",
        "다음엔 가족이랑 같이 빌리러 올게요.",
        "녹화 버튼 누르는 손맛이 있네요",
      ],
    },
  },
  "aka-coffee-room": {
    q1: "오늘, 당신의 행복은 무엇인가요?",
    q2: "공간에서 처음 느낀 감정은 무엇인가요?",
    notes: {
      QUESTION_1: [
        "따뜻한 커피 한 잔",
        "오랜만에 친구랑 마주 앉아 웃은 것.",
        "퇴근길에 잠깐 들러서 아무 생각 없이 앉아 있는 이 시간이요. 오늘은 이걸로 충분해요.",
        "날씨가 좋았다. 그거면 됐다",
      ],
      QUESTION_2: [
        "편안함",
        "문 열고 들어왔을 때 조금 설렜어요.",
        "처음인데 오래 다닌 곳처럼 익숙했어요. 이유는 잘 모르겠지만 마음이 놓였습니다.",
      ],
      FREE: [
        "조금 아쉬운 채로 돌아갑니다. 그래서 또 올 것 같아요.",
        "행복하세요, 라는 말에 괜히 기분이 좋아졌어요.",
      ],
    },
  },
};

/* ── 재현 가능한 난수(같은 공간이면 실행할 때마다 같은 배치 · 날짜) ── */
function rng(seedText: string) {
  let h = 2166136261;
  for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const DAY = 24 * 60 * 60 * 1000;

async function findAuthor() {
  return prisma.user.findUnique({ where: { email: AUTHOR_EMAIL }, select: { id: true, isDemo: true } });
}

async function ensureAuthor() {
  const found = await findAuthor();
  if (found) {
    if (!found.isDemo) throw new Error("샘플 작성자 계정이 더미(isDemo)가 아닙니다 — 안전을 위해 중단합니다.");
    return found.id;
  }
  const nicknameTaken = await prisma.user.findFirst({ where: { nickname: AUTHOR_NICKNAME }, select: { id: true } });
  const created = await prisma.user.create({
    data: {
      email: AUTHOR_EMAIL,
      name: AUTHOR_NICKNAME,
      nickname: nicknameTaken ? null : AUTHOR_NICKNAME,
      isDemo: true,
      profilePublic: false, // 프로필 · 사람 추천에 절대 나오지 않게(더미라 원래도 제외)
    },
    select: { id: true },
  });
  return created.id;
}

(async () => {
  try {
    // 문장 길이 확인(VarChar 80)
    for (const [slug, s] of Object.entries(SAMPLES)) {
      for (const list of Object.values(s.notes)) {
        for (const t of list!) if (t.length > MAX_LEN) throw new Error(`${slug}: ${MAX_LEN}자 초과 문장 — "${t}"`);
      }
    }

    if (CLEANUP) {
      const author = await findAuthor();
      if (!author) {
        console.log("샘플 작성자가 없습니다 — 지울 것이 없어요.");
        return;
      }
      if (!author.isDemo) throw new Error("샘플 작성자 계정이 더미(isDemo)가 아닙니다 — 안전을 위해 중단합니다.");
      const n = await prisma.guestbookNote.count({ where: { userId: author.id } });
      if (!APPLY && !process.argv.includes("--yes")) {
        console.log(`샘플 ${n}개와 샘플 작성자 계정을 지웁니다(미리보기). 실제로 지우려면 --cleanup --yes`);
        return;
      }
      const del = await prisma.guestbookNote.deleteMany({ where: { userId: author.id } });
      await prisma.user.delete({ where: { id: author.id } });
      console.log(`샘플 ${del.count}개 · 샘플 작성자 계정 삭제`);
      return;
    }

    const spaces = await prisma.space.findMany({
      where: { isActive: true, isDemo: false },
      select: { id: true, slug: true, name: true, guestbookSettings: { select: { defaultPostitColor: true } } },
      orderBy: { createdAt: "asc" },
    });
    const author = APPLY ? await ensureAuthor() : (await findAuthor())?.id ?? null;
    const now = Date.now();
    let total = 0;

    for (const space of spaces) {
      const def = SAMPLES[space.slug];
      const session = await prisma.guestbookSession.findFirst({ where: { spaceId: space.id, status: "ACTIVE" } });
      if (!def || !session) {
        console.log(`- ${space.name}: ${!def ? "샘플 문장 없음" : "진행 중인 방명록 없음"} — 건너뜀`);
        continue;
      }
      if ((session.question1 ?? null) !== def.q1 || (session.question2 ?? null) !== def.q2) {
        console.log(`- ${space.name}: 방명록 질문이 바뀌어 건너뜀(현재: ${session.question1} / ${session.question2})`);
        continue;
      }

      const existingSamples = author ? await prisma.guestbookNote.count({ where: { spaceId: space.id, userId: author } }) : 0;
      const plan = (Object.entries(def.notes) as [ClusterType, string[]][]).flatMap(([cluster, list]) => list.map((content) => ({ cluster, content })));
      total += plan.length;
      console.log(`- ${space.name}: 샘플 ${plan.length}개 (기존 샘플 ${existingSamples}개 → 지우고 다시)  Q1 "${def.q1}"${def.q2 ? ` · Q2 "${def.q2}"` : ""}`);
      if (!APPLY || !author) continue;

      // 같은 공간의 기존 샘플만 지운다(이 작성자의 글만 — 실제 글은 조건에 걸릴 수 없다)
      await prisma.guestbookNote.deleteMany({ where: { spaceId: space.id, userId: author } });

      // 장애물: 이 세션의 실제 글(지운 글 제외) + 보이는 군집 라벨. 실제 글은 읽기만 한다.
      const real = await prisma.guestbookNote.findMany({ where: { guestbookSessionId: session.id, deletedAt: null }, select: { x: true, y: true } });
      const centers: Record<ClusterType, { x: number; y: number }> = {
        FREE: { x: session.freeClusterX, y: session.freeClusterY },
        QUESTION_1: { x: session.question1ClusterX, y: session.question1ClusterY },
        QUESTION_2: { x: session.question2ClusterX, y: session.question2ClusterY },
      };
      const obstacles: Rect[] = [
        ...real.map((n) => ({ x: n.x, y: n.y, width: POST_IT_WIDTH, height: POST_IT_HEIGHT })),
        ...Object.values(centers).map((c) => clusterLabelRect(c)),
      ];

      const rand = rng(`sample-guestbook:${space.slug}`);
      // 날짜: 최근 3주(세션 시작 이후)에 흩어 놓는다 — 정렬 · 날짜 표시 확인용. 분석에는 들어가지 않는다.
      const from = Math.max(now - 21 * DAY, (session.startsAt ?? session.createdAt).getTime());
      const color = space.guestbookSettings?.defaultPostitColor ?? "#F6E7A8";
      const rows = [];
      for (const [i, item] of plan.entries()) {
        const c = centers[item.cluster];
        // 라벨 아래쪽 반원에 흩뿌린 뒤, 실제 캔버스와 같은 규칙(findFreePosition)으로 빈자리를 찾는다
        const angle = Math.PI * (0.05 + 0.9 * rand());
        const r = 260 + rand() * 420;
        const desired = { x: c.x + Math.cos(angle) * r - POST_IT_WIDTH / 2, y: c.y + Math.sin(angle) * r * 0.9 };
        const spot = findFreePosition(desired, POST_IT_WIDTH, POST_IT_HEIGHT, obstacles);
        if (!spot) {
          console.log(`  · 자리를 못 찾아 건너뜀: "${item.content}"`);
          continue;
        }
        obstacles.push({ x: spot.x, y: spot.y, width: POST_IT_WIDTH, height: POST_IT_HEIGHT });
        const createdAt = new Date(from + ((now - from) * (i + rand())) / plan.length);
        rows.push({
          userId: author,
          spaceId: space.id,
          guestbookSessionId: session.id,
          recordId: null,
          clusterType: item.cluster,
          content: item.content,
          nickname: NOTE_NICKNAME,
          x: spot.x,
          y: spot.y,
          rotation: Math.round((rand() * 8 - 4) * 10) / 10,
          color,
          createdAt,
          updatedAt: createdAt,
        });
      }
      await prisma.guestbookNote.createMany({ data: rows });
    }

    console.log(`\n합계 ${total}개 ${APPLY ? "만들었어요" : "(미리보기 — 만들려면 --apply)"}`);
  } finally {
    await prisma.$disconnect();
  }
})();
