/* ── "이번 방문" Record 확보 ──────────────────────────────────────────
   /api/records(취향 점수 폼 제출)와 방명록 첫 진입(취향 점수 없이 조용히 방문만 기록) 양쪽이
   공유하는 단일 지점 — "마지막 Record로부터 REVISIT_INTERVAL_HOURS가 지났으면 새 Record,
   아니면 같은 Record를 갱신"하는 재방문 판정 + advisory lock 경쟁 방지를 여기 한 곳에 모은다.
   tasteScore/memo/tags를 생략하면(취향 점수 입력 없이 방명록에 바로 들어온 경우) 값 없는
   최소 Record만 생성/유지된다 — 이후 /space/[slug]/record에서 점수를 입력하면 같은 Record가
   갱신될 뿐, 새 Record가 생기지 않는다(재방문 판정 기준이 동일하므로). ── */

import { prisma } from "@/lib/prisma";
import { TagKey } from "@prisma/client";
import { isNewVisitForRecord } from "@/lib/visit";

export interface RecordVisitInput {
  /** 키 자체를 생략하면(예: 방명록 조용한 진입 확보) 기존 Record를 갱신할 때 이 필드를 건드리지
   *  않는다 — 이미 입력된 취향 점수/메모가 매 페이지 렌더마다 null로 덮어써지는 것을 막는다.
   *  명시적으로 값(또는 null)을 넣으면(예: 취향 점수 폼 제출) 그 값으로 항상 덮어쓴다. */
  memo?: string | null;
  tasteScore?: number | null;
  tags?: TagKey[];
}

export interface RecordVisitResult {
  record: { id: string; userId: string; spaceId: string; tasteScore: number | null; visitedAt: Date };
  isNew: boolean;
}

/**
 * 이번 방문의 Record를 확보한다(없으면 생성, 재방문 간격 이내면 갱신). memo/tasteScore는
 * "키가 실제로 전달됐는지"로 갱신 여부를 판단한다(값이 undefined/null이어도 키가 있으면
 * 명시적 지정으로 취급) — 그래야 방명록 첫 진입 시 빈 입력({})으로 이 함수를 호출해도 이미
 * 저장된 취향 점수를 지우지 않는다. 새로 생성할 때는 전달 여부와 무관하게 없으면 null.
 */
export async function upsertCurrentRecord(
  userId: string,
  spaceId: string,
  input: RecordVisitInput = {},
): Promise<RecordVisitResult> {
  const hasMemo = "memo" in input;
  const hasTasteScore = "tasteScore" in input;
  const { memo, tasteScore, tags } = input;

  const { record, isNew } = await prisma.$transaction(
    async (tx) => {
      // 같은 userId+spaceId에 대한 두 요청이 거의 동시에 도달해도(더블탭, 페이지 렌더+API 호출
      // 경합 등) 둘 다 "최근 기록 없음"을 보고 각자 create로 분기하지 않도록 직렬화한다.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${spaceId}))`;

      const lastRecord = await tx.record.findFirst({
        where: { userId, spaceId },
        orderBy: { visitedAt: "desc" },
      });

      if (lastRecord && !isNewVisitForRecord(lastRecord.visitedAt)) {
        const updated = await tx.record.update({
          where: { id: lastRecord.id },
          data: {
            ...(hasMemo ? { memo: memo || null } : {}),
            ...(hasTasteScore ? { tasteScore: tasteScore ?? null } : {}),
            ...(tags && tags.length > 0 ? { tags: { deleteMany: {}, create: tags.map((tag) => ({ tag })) } } : {}),
          },
        });
        return { record: updated, isNew: false };
      }

      const created = await tx.record.create({
        data: {
          userId,
          spaceId,
          memo: hasMemo ? memo || null : null,
          tasteScore: hasTasteScore ? (tasteScore ?? null) : null,
          ...(tags && tags.length > 0 ? { tags: { create: tags.map((tag) => ({ tag })) } } : {}),
        },
      });
      return { record: created, isNew: true };
    },
    { maxWait: 5000, timeout: 8000 },
  );

  return { record, isNew };
}
