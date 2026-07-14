/**
 * 기존 GuestbookNote/GuestbookComment에는 방문 단위 식별자(recordId)가 없다 — "한 번의 방문은
 * 하나의 흔적을 남긴다" 정책을 도입하며 recordId(GuestbookNote/GuestbookComment → Record)와
 * GuestbookComment.guestbookSessionId를 새로 추가했기 때문이다.
 *
 * 이 스크립트는 각 레거시 행에 대해 "작성 시점과 가장 가까운 해당 사용자의 방문 기록(Record)"을
 * 찾아 recordId를 채운다. 억지로 없는 방문 기록을 만들거나 잘못 이어붙이지 않는다 — 연결할 Record가
 * 아예 없으면 null로 남긴다(기존 데이터는 삭제/이동하지 않고 보존, 신규 작성부터 방문 단위 제약 적용).
 * 댓글에는 note.guestbookSessionId도 함께 채워 세션 단위 유니크 제약이 온전히 걸리게 한다.
 *
 * prisma db push로 recordId(GuestbookNote/GuestbookComment)/guestbookSessionId(GuestbookComment)
 * 컬럼이 생긴 뒤 1회 실행한다. 이미 채워진 행은 건드리지 않으므로 여러 번 실행해도 안전하다.
 *
 * 실행: npx tsx prisma/migrate-guestbook-visits.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function nearestRecordId(records: { id: string; visitedAt: Date }[], at: Date): string | null {
  if (records.length === 0) return null;
  let best = records[0];
  let bestDiff = Math.abs(records[0].visitedAt.getTime() - at.getTime());
  for (const r of records.slice(1)) {
    const diff = Math.abs(r.visitedAt.getTime() - at.getTime());
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }
  return best.id;
}

async function backfillNotes() {
  const notes = await prisma.guestbookNote.findMany({
    where: { recordId: null },
    select: { id: true, userId: true, spaceId: true, createdAt: true },
  });
  if (notes.length === 0) {
    console.log("recordId가 없는 GuestbookNote 없음 — 건너뜀");
    return;
  }

  // (userId, spaceId)별로 방문 기록을 한 번씩만 로드해서 재사용
  const recordsCache = new Map<string, { id: string; visitedAt: Date }[]>();
  let updated = 0;
  let skipped = 0;

  for (const note of notes) {
    const key = `${note.userId}:${note.spaceId}`;
    let records = recordsCache.get(key);
    if (!records) {
      records = await prisma.record.findMany({
        where: { userId: note.userId, spaceId: note.spaceId },
        select: { id: true, visitedAt: true },
      });
      recordsCache.set(key, records);
    }
    const recordId = nearestRecordId(records, note.createdAt);
    if (!recordId) {
      skipped++;
      continue;
    }
    await prisma.guestbookNote.update({ where: { id: note.id }, data: { recordId } });
    updated++;
  }

  console.log(`GuestbookNote: ${updated}건 recordId 연결, ${skipped}건 연결할 방문 기록 없어 null 유지`);
}

async function backfillComments() {
  const comments = await prisma.guestbookComment.findMany({
    where: { recordId: null },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      note: { select: { spaceId: true, guestbookSessionId: true } },
    },
  });
  if (comments.length === 0) {
    console.log("recordId가 없는 GuestbookComment 없음 — 건너뜀");
    return;
  }

  const recordsCache = new Map<string, { id: string; visitedAt: Date }[]>();
  let updated = 0;
  let skipped = 0;

  for (const comment of comments) {
    const key = `${comment.userId}:${comment.note.spaceId}`;
    let records = recordsCache.get(key);
    if (!records) {
      records = await prisma.record.findMany({
        where: { userId: comment.userId, spaceId: comment.note.spaceId },
        select: { id: true, visitedAt: true },
      });
      recordsCache.set(key, records);
    }
    const recordId = nearestRecordId(records, comment.createdAt);
    await prisma.guestbookComment.update({
      where: { id: comment.id },
      data: { guestbookSessionId: comment.note.guestbookSessionId, ...(recordId ? { recordId } : {}) },
    });
    if (recordId) updated++;
    else skipped++;
  }

  console.log(`GuestbookComment: guestbookSessionId ${comments.length}건 전건 백필, recordId는 ${updated}건 연결/${skipped}건 null 유지`);
}

async function main() {
  await backfillNotes();
  await backfillComments();

  const remainingNotes = await prisma.guestbookNote.count({ where: { recordId: null } });
  const remainingComments = await prisma.guestbookComment.count({ where: { recordId: null } });
  console.log(
    `남은 recordId 미배정 — Note: ${remainingNotes}건, Comment: ${remainingComments}건 (연결할 방문 기록이 없던 레거시 데이터, 정상)`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
