/**
 * 기존 데이터 보존형 마이그레이션 — 세션/군집 없이 저장된 기존 GuestbookNote를
 * 공간별 "이전 방명록"(ARCHIVED) 세션으로 백필하고, 방문자가 계속 흔적을 남길 수 있도록
 * 공간마다 새 ACTIVE 세션(자유 군집만, 질문 없음)을 함께 만든다.
 *
 * prisma db push로 GuestbookSession/GuestbookNote.guestbookSessionId(nullable) 등
 * 새 테이블/컬럼이 생긴 뒤 1회 실행한다. 기존 컬럼/데이터는 건드리지 않고 세션 배정만
 * 채워 넣는 순수 추가(additive) 작업이며, 여러 번 실행해도 안전하도록 작성했다.
 *
 * 실행: npx tsx prisma/migrate-guestbook-sessions.ts
 */
import { PrismaClient, GuestbookSessionStatus } from "@prisma/client";

const prisma = new PrismaClient();

// 스키마가 최종적으로 guestbookSessionId를 필수(non-null)로 선언하고 있어서, 지금 시점의
// Prisma Client 타입으로는 "세션이 null인 노트"를 표현할 수 없다. 이 스크립트는 그 필드가
// 아직 nullable이던 1단계 push 직후에 실행하는 것을 전제로 하므로, 이 세 지점만 raw SQL로 작성한다.
async function backfillLegacyNotes(spaceId: string) {
  const legacyNotes = await prisma.$queryRaw<{ id: string; createdAt: Date }[]>`
    SELECT id, "createdAt" FROM "GuestbookNote"
    WHERE "spaceId" = ${spaceId} AND "guestbookSessionId" IS NULL
    ORDER BY "createdAt" ASC
  `;
  if (legacyNotes.length === 0) return;

  // 재실행 대비 — 이미 만든 "이전 방명록" 세션이 있으면 재사용한다.
  let legacySession = await prisma.guestbookSession.findFirst({
    where: { spaceId, title: "이전 방명록" },
  });
  if (!legacySession) {
    legacySession = await prisma.guestbookSession.create({
      data: {
        spaceId,
        title: "이전 방명록",
        status: GuestbookSessionStatus.ARCHIVED,
        startsAt: legacyNotes[0].createdAt,
        endsAt: legacyNotes[legacyNotes.length - 1].createdAt,
      },
    });
  }

  await prisma.$executeRaw`
    UPDATE "GuestbookNote" SET "guestbookSessionId" = ${legacySession.id}
    WHERE "spaceId" = ${spaceId} AND "guestbookSessionId" IS NULL
  `;
}

async function ensureActiveSession(spaceId: string) {
  const existingActive = await prisma.guestbookSession.findFirst({
    where: { spaceId, status: GuestbookSessionStatus.ACTIVE },
  });
  if (existingActive) return;

  await prisma.guestbookSession.create({
    data: {
      spaceId,
      title: "방명록",
      status: GuestbookSessionStatus.ACTIVE,
      startsAt: new Date(),
    },
  });
}

async function ensureOneActiveSessionIndex() {
  // Prisma 스키마 문법으로 표현 불가능한 partial unique index — 공간당 ACTIVE 세션 1개만 허용.
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS guestbook_session_one_active
    ON "guestbook_sessions" ("spaceId")
    WHERE status = 'ACTIVE'
  `);
}

async function main() {
  const spaces = await prisma.space.findMany({ select: { id: true, name: true } });
  console.log(`총 ${spaces.length}개 공간 처리 시작...`);

  for (const space of spaces) {
    await backfillLegacyNotes(space.id);
    await ensureActiveSession(space.id);
  }

  console.log("1) 공간별 이전 방명록 세션 백필 + 신규 ACTIVE 세션 부트스트랩 완료");

  await ensureOneActiveSessionIndex();
  console.log("2) 공간당 ACTIVE 세션 1개 제약(partial unique index) 적용 완료");

  const remainingRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "GuestbookNote" WHERE "guestbookSessionId" IS NULL
  `;
  console.log(`남은 미배정 노트: ${Number(remainingRows[0]?.count ?? 0)}건 (0이어야 정상)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
