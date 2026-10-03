/* ── 함께한 공간의 현장 흔적 수(읽기 전용) ──────────────────────────────────
   공개 계층(EditorialSpace)과 운영 계층(Space)은 FK 없이 분리돼 있다. 함께한 공간 상세에서
   "방명록으로 이어진다"는 사실을 실제 숫자로만 보여주기 위해, 같은 slug의 운영 공간 방명록 글 수를
   한 번 세는 것이 이 모듈의 유일한 역할이다. 내용·링크는 내보내지 않는다(현장에서만 연다).
   공개 방문자 화면과 같은 기준: 공개 중·시연 아님, 숨김/삭제 제외, 더미 계정 글 제외. ── */

import { prisma } from "@/lib/prisma";
import { LISTED_SPACE_WHERE, guestbookAuthorFilter } from "@/lib/demoData";

export async function countPartnerGuestbookTraces(slug: string): Promise<number> {
  return prisma.guestbookNote.count({
    where: {
      space: { slug, ...LISTED_SPACE_WHERE },
      isHidden: false,
      deletedAt: null,
      ...guestbookAuthorFilter(false),
    },
  });
}
