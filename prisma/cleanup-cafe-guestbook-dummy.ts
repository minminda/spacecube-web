/**
 * seed-cafe-guestbook-dummy.ts로 만든 더미 방명록을 완전히 삭제한다.
 * 더미 작성자 User(email이 "dummy.cafe-demo+"로 시작)만 지우면 GuestbookNote/GuestbookReaction이
 * onDelete: Cascade로 함께 삭제된다 — 다른 공간·실제 사용자 데이터는 전혀 건드리지 않는다.
 * 실행: npx tsx prisma/cleanup-cafe-guestbook-dummy.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const dummyUsers = await prisma.user.findMany({
    where: { email: { startsWith: "dummy.cafe-demo+" } },
    select: { id: true, email: true },
  });
  if (dummyUsers.length === 0) {
    console.log("dummy.cafe-demo+ 더미 유저가 없습니다 — 삭제할 게 없어요.");
    return;
  }

  const noteCount = await prisma.guestbookNote.count({ where: { userId: { in: dummyUsers.map((u) => u.id) } } });
  console.log(`더미 유저 ${dummyUsers.length}명, 연결된 포스트잇 ${noteCount}개 삭제 중...`);

  await prisma.user.deleteMany({ where: { id: { in: dummyUsers.map((u) => u.id) } } });

  console.log("삭제 완료 (GuestbookNote/GuestbookReaction은 cascade로 함께 삭제됨).");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
