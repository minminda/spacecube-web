/**
 * 방명록 샘플 — 지금 운영 중인 공간의 방명록이 비어 보이지 않게, 현재 질문에 답하는 글을 공간당 TARGET개까지 채운다.
 *   npx tsx --env-file=.env scripts/seed-sample-guestbook.ts            미리보기(DB 변경 없음)
 *   npx tsx --env-file=.env scripts/seed-sample-guestbook.ts --apply    반영(부족한 만큼만 추가 — 몇 번 실행해도 개수가 늘지 않는다)
 *   npx tsx --env-file=.env scripts/seed-sample-guestbook.ts --cleanup  지울 개수 미리보기 / --cleanup --yes 로 샘플과 샘플 작성자 계정만 지우기
 *
 * 대상(공간 목록을 하드코딩하지 않는다 — 실행할 때 DB에서 고른다):
 *   공개 중 · 시연 아님(Space.isActive && !isDemo = LISTED_SPACE_WHERE) + 진행 중인 방명록 세션(status ACTIVE)이 있는 공간.
 *   답은 공간 이름이 아니라 그 세션의 질문 문장으로 scripts/sample-guestbook-answers.ts에서 찾는다.
 *   보이는 질문 중 하나라도 답변 모음에 없으면 그 공간은 만들지 않고 로그로 알린다. 새 글은 질문 칸에만(자유 칸 X).
 *
 * 실제 데이터와 분리(스키마 추가 없음 — 기존 더미 계정 정책 src/lib/demoData.ts 재사용):
 *   - 작성자는 샘플 전용 더미 계정 하나(User.isDemo, SAMPLE_GUESTBOOK_AUTHOR_EMAIL). 포스트잇 이름은 비로그인 방문자와 같은
 *     "익명의 방문자"라 화면에서는 일반 글과 같고, 구분은 DB(작성자 계정)에만 있다.
 *   - 방문자 방명록 화면에는 보이지만(guestbookVisibleAuthorFilter) 운영자 화면 · 포스트잇 수 · KPI · 월간 리포트 · 퍼널 · 추천 ·
 *     공개 프로필에서는 빠진다(getKpiExcludedUserIds / REAL_GUESTBOOK_NOTE_WHERE). 관리자 방명록 목록에만 SAMPLE로 표시.
 *   - Record · 공감 · 댓글 · 퍼널 이벤트는 만들지 않는다. recomputeSpaceKPI도 부르지 않는다.
 *   - 실제 글은 읽기만 한다(배치할 때 피하는 장애물로만). 수정 · 삭제하는 건 이 작성자의 글뿐이고,
 *     지금 질문에 맞지 않는 예전 샘플(자유 칸 · 바뀐 질문 · 중복)도 실제 방문자의 공감 · 댓글이 달려 있으면 지우지 않는다.
 */
import { PrismaClient, type ClusterType } from "@prisma/client";
import { findFreePosition, clusterLabelRect, POST_IT_WIDTH, POST_IT_HEIGHT, type Rect } from "../src/lib/postitCollision";
import { ANONYMOUS_NICKNAME } from "../src/lib/anonNickname";
import { SAMPLE_GUESTBOOK_AUTHOR_EMAIL } from "../src/lib/sampleGuestbookAuthor";
import { planSampleTopUp } from "../src/lib/sampleGuestbookPlan";
import { SAMPLE_ANSWERS } from "./sample-guestbook-answers";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const CLEANUP = process.argv.includes("--cleanup");

const TARGET = 12; // 공간당 샘플 개수(10~15 사이)
const AUTHOR_EMAIL = SAMPLE_GUESTBOOK_AUTHOR_EMAIL;
const AUTHOR_NICKNAME = "방명록샘플"; // 계정 내부 이름 — 포스트잇에는 쓰지 않는다(프로필 비공개)
/** 포스트잇 아래 이름 — 비로그인 방문자와 같은 고정 익명 이름(가짜 사용자 이름을 지어내지 않는다) */
const NOTE_NICKNAME = ANONYMOUS_NICKNAME;
const MAX_LEN = 80; // GuestbookNote.content VarChar(80)

/* ── 재현 가능한 난수(같은 공간 · 같은 문장이면 실행할 때마다 같은 배치 · 날짜) ── */
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
    for (const [question, answers] of Object.entries(SAMPLE_ANSWERS)) {
      for (const a of answers) if (a.length > MAX_LEN) throw new Error(`"${question}": ${MAX_LEN}자 초과 문장 — "${a}"`);
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

    const existingAuthor = await findAuthor();
    if (existingAuthor && !existingAuthor.isDemo) throw new Error("샘플 작성자 계정이 더미(isDemo)가 아닙니다 — 안전을 위해 중단합니다.");
    let authorId = existingAuthor?.id ?? null;

    // 지금 운영 중인 공간 = 공개 중 · 시연 아님(LISTED_SPACE_WHERE와 같은 조건)
    const spaces = await prisma.space.findMany({
      where: { isActive: true, isDemo: false },
      select: { id: true, slug: true, name: true, guestbookSettings: { select: { defaultPostitColor: true } } },
      orderBy: { createdAt: "asc" },
    });
    console.log(`운영 중인 공간(공개 · 시연 아님) ${spaces.length}곳 — 공간당 목표 ${TARGET}개${APPLY ? "" : " (미리보기)"}`);

    // 예전 샘플의 포스트잇 이름("샘플")을 익명 방문자로 — 이제 방문자 화면 · 이전 방명록에 보이므로 이 작성자의 글 전부(공간 무관)
    const oldNames = authorId ? await prisma.guestbookNote.count({ where: { userId: authorId, nickname: { not: NOTE_NICKNAME } } }) : 0;
    console.log(`예전 이름이 남은 샘플 ${oldNames}개 → "${NOTE_NICKNAME}"${APPLY ? "" : "(미리보기)"}\n`);
    if (APPLY && oldNames > 0) await prisma.guestbookNote.updateMany({ where: { userId: authorId!, nickname: { not: NOTE_NICKNAME } }, data: { nickname: NOTE_NICKNAME } });
    const now = Date.now();
    const totals = { spaces: 0, keep: 0, add: 0, stale: 0, staleKept: 0 };

    for (const space of spaces) {
      const session = await prisma.guestbookSession.findFirst({ where: { spaceId: space.id, status: "ACTIVE" } });
      if (!session) {
        console.log(`- ${space.name} (${space.slug}): 진행 중인 방명록 없음 — 건너뜀`);
        continue;
      }

      const existing = authorId
        ? await prisma.guestbookNote.findMany({
            where: { guestbookSessionId: session.id, userId: authorId, deletedAt: null },
            select: { id: true, clusterType: true, content: true, _count: { select: { reactions: true, comments: true } } },
            orderBy: { createdAt: "asc" },
          })
        : [];
      const plan = planSampleTopUp({
        questions: [
          { cluster: "QUESTION_1", question: session.question1, visible: session.question1Visible },
          { cluster: "QUESTION_2", question: session.question2, visible: session.question2Visible },
        ],
        existing,
        bank: SAMPLE_ANSWERS,
        target: TARGET,
      });

      // 지금 질문에 맞지 않는 예전 샘플 — 실제 방문자의 공감 · 댓글이 없을 때만 지운다
      const engaged = new Set(existing.filter((n) => n._count.reactions + n._count.comments > 0).map((n) => n.id));
      const staleRemovable = plan.stale.filter((n) => !engaged.has(n.id));
      const staleKept = plan.stale.length - staleRemovable.length;
      const staleNote = plan.stale.length
        ? ` · 질문에 안 맞는 예전 샘플 ${plan.stale.length}개(정리 ${staleRemovable.length}${staleKept ? ` · 실제 공감 · 댓글이 있어 유지 ${staleKept}` : ""})`
        : "";
      totals.stale += staleRemovable.length;
      totals.staleKept += staleKept;

      const qs = `Q1 "${session.question1 ?? "-"}"${session.question1Visible ? "" : "(숨김)"} · Q2 "${session.question2 ?? "-"}"${session.question2Visible ? "" : "(숨김)"}`;
      if (plan.status === "skip") {
        console.log(`- ${space.name} (${space.slug}): ${plan.reason} — 새로 만들지 않음  ${qs}${staleNote}`);
      } else {
        totals.spaces++;
        totals.keep += plan.keep.length;
        totals.add += plan.add.length;
        const byQ = plan.questions
          .map((q) => `${q.cluster === "QUESTION_1" ? "Q1" : "Q2"} ${plan.keep.filter((n) => n.clusterType === q.cluster).length + plan.add.filter((a) => a.cluster === q.cluster).length}`)
          .join(" · ");
        console.log(`- ${space.name} (${space.slug}): 기존 ${plan.keep.length} + 추가 ${plan.add.length} = ${plan.keep.length + plan.add.length}개 (${byQ})  ${qs}${staleNote}`);
      }
      if (!APPLY) continue;

      if (staleRemovable.length) {
        await prisma.guestbookNote.deleteMany({ where: { id: { in: staleRemovable.map((n) => n.id) }, userId: authorId! } });
      }
      if (plan.status === "skip") continue;

      if (plan.add.length === 0) continue;

      authorId ??= await ensureAuthor();
      // 장애물: 이 세션에 지금 남아 있는 모든 글(실제 글 + 유지한 샘플) + 보이는 군집 라벨. 실제 글은 읽기만 한다.
      const placed = await prisma.guestbookNote.findMany({ where: { guestbookSessionId: session.id, deletedAt: null }, select: { x: true, y: true } });
      const centers: Record<ClusterType, { x: number; y: number }> = {
        FREE: { x: session.freeClusterX, y: session.freeClusterY },
        QUESTION_1: { x: session.question1ClusterX, y: session.question1ClusterY },
        QUESTION_2: { x: session.question2ClusterX, y: session.question2ClusterY },
      };
      const obstacles: Rect[] = [
        ...placed.map((n) => ({ x: n.x, y: n.y, width: POST_IT_WIDTH, height: POST_IT_HEIGHT })),
        ...Object.values(centers).map((c) => clusterLabelRect(c)),
      ];

      // 날짜: 최근 3주(세션 시작 이후)에 흩어 놓는다. 분석에는 들어가지 않는다.
      const from = Math.max(now - 21 * DAY, (session.startsAt ?? session.createdAt).getTime());
      const color = space.guestbookSettings?.defaultPostitColor ?? "#F6E7A8";
      const rows = [];
      for (const item of plan.add) {
        const rand = rng(`sample-guestbook:${space.slug}:${item.cluster}:${item.content}`);
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
        const createdAt = new Date(from + (now - from) * rand());
        rows.push({
          userId: authorId,
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

    console.log(
      `\n샘플을 채우는 공간 ${totals.spaces}곳 — 유지 ${totals.keep} + 추가 ${totals.add}개` +
        (totals.stale || totals.staleKept ? ` · 질문에 안 맞는 예전 샘플 정리 ${totals.stale}개(실제 공감 · 댓글이 있어 유지 ${totals.staleKept}개)` : "") +
        ` ${APPLY ? "— 반영했어요" : "(미리보기 — 반영하려면 --apply)"}`,
    );
  } finally {
    await prisma.$disconnect();
  }
})();
