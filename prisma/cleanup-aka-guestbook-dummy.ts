/**
 * seed-aka-guestbook-dummy.ts로 만든 더미 방명록을 완전히 삭제한다.
 * 더미 작성자 User(email이 "dummy.aka-demo+"로 시작)만 지우면 GuestbookNote/GuestbookReaction이
 * onDelete: Cascade로 함께 삭제된다 — 다른 공간·실제 사용자 데이터는 전혀 건드리지 않는다.
 *
 * 삭제 후 이 공간의 SpaceKPI 방명록 참여 수치를 즉시 원상복구하려면, 삭제 직후
 * /admin/[id]/report 페이지를 한 번 다시 열어 recomputeSpaceKPI를 재트리거할 것
 * (해당 페이지는 조회 시점에 항상 원본 테이블에서 전체 재계산하므로 별도 백필 스크립트 불필요).
 *
 * 실행: npx tsx prisma/cleanup-aka-guestbook-dummy.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const dummyUsers = await prisma.user.findMany({
    where: { email: { startsWith: "dummy.aka-demo+" } },
    select: { id: true, email: true },
  });
  if (dummyUsers.length === 0) {
    console.log("dummy.aka-demo+ 더미 유저가 없습니다 — 삭제할 게 없어요.");
    return;
  }

  const noteCount = await prisma.guestbookNote.count({ where: { userId: { in: dummyUsers.map((u) => u.id) } } });
  console.log(`더미 유저 ${dummyUsers.length}명, 연결된 포스트잇 ${noteCount}개 삭제 중...`);

  await prisma.user.deleteMany({ where: { id: { in: dummyUsers.map((u) => u.id) } } });

  console.log("삭제 완료 (GuestbookNote/GuestbookReaction은 cascade로 함께 삭제됨).");
  console.log("KPI 원상복구: /admin/[id]/report 페이지를 한 번 열어 재계산을 트리거하세요.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
