import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TagKey } from "@prisma/client";
import { ENABLE_RECORD_TAG_SELECTION, ENABLE_TASTE_SCORE_RECOMMENDATION } from "@/lib/features";
import { isNewVisit } from "@/lib/visit";
import { recomputeSpaceKPI } from "@/lib/kpi";
import { requireSpaceUnlock, canBypassSpaceLock } from "@/lib/spaceUnlock";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId, tags, memo, tasteScore } = await req.json();

  if (!spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  // 신규 UX: 취향 적합도 1~5 필수
  const validScore =
    typeof tasteScore === "number" && Number.isInteger(tasteScore) && tasteScore >= 1 && tasteScore <= 5
      ? tasteScore
      : null;

  if (ENABLE_TASTE_SCORE_RECOMMENDATION && validScore === null) {
    return NextResponse.json({ error: "tasteScore (1~5) is required" }, { status: 400 });
  }

  // 레거시 UX: 태그 선택 필수 (ENABLE_RECORD_TAG_SELECTION 켜졌을 때만)
  if (ENABLE_RECORD_TAG_SELECTION && (!tags || tags.length === 0)) {
    return NextResponse.json({ error: "tags are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, ownerId: true } });
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  // 취향 점수 저장(Record 생성/갱신)은 공간의 이야기를 여는 관문이다 — 실제 Cube QR을 인식해
  // 이 공간의 SpaceUnlock을 받은 사용자만 저장할 수 있다(관리자·해당 공간 운영자는 예외).
  const bypass = canBypassSpaceLock(session.user.email, space, user.id);
  if (!bypass && !(await requireSpaceUnlock(user.id, spaceId))) {
    return NextResponse.json(
      { error: "이 공간은 아직 잠겨 있어요. 공간에 놓인 큐브의 QR을 스캔해주세요." },
      { status: 403 },
    );
  }

  // 재방문 인정 기준: 마지막으로 인정된 방문(가장 최근 Record)으로부터 REVISIT_INTERVAL_HOURS
  // 이상 지나야 새 방문으로 인정한다. 그 전이면 새 Record를 만들지 않고 같은 방문의 기록을
  // 갱신한다 — 새로고침/반복 접속으로 방문 횟수가 늘어나는 걸 서버에서 막는다.
  //
  // 이 조회→분기(update/create)는 advisory lock으로 감싼다: 같은 userId+spaceId에 대한
  // 두 요청이 거의 동시에 도달하면(모바일 더블탭 등) 트랜잭션 밖에서는 둘 다 "최근 기록 없음"을
  // 보고 각자 create로 분기해 같은 방문에 Record가 2건 생길 수 있다. pg_advisory_xact_lock은
  // 같은 키의 두 번째 트랜잭션을 첫 번째가 커밋할 때까지 대기시켜, 두 번째 요청이 항상 "방금
  // 생긴 기록"을 보고 올바르게 update 분기로 가도록 만든다(재시도 로직 불필요, 새 스키마 불필요).
  // xact 변형이라 트랜잭션 종료 시 자동 해제되므로 커넥션 풀링 환경에서도 락이 남지 않는다 —
  // 세션 범위인 pg_advisory_lock으로 바꾸지 말 것.
  const { record, isNew } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}), hashtext(${spaceId}))`;

    const lastRecord = await tx.record.findFirst({
      where: { userId: user.id, spaceId },
      orderBy: { visitedAt: "desc" },
    });

    if (lastRecord && !isNewVisit(lastRecord.visitedAt)) {
      const updated = await tx.record.update({
        where: { id: lastRecord.id },
        data: {
          memo: memo || null,
          tasteScore: validScore,
          ...(ENABLE_RECORD_TAG_SELECTION && tags?.length > 0
            ? { tags: { deleteMany: {}, create: tags.map((tag: TagKey) => ({ tag })) } }
            : {}),
        },
      });
      return { record: updated, isNew: false };
    }

    const created = await tx.record.create({
      data: {
        userId: user.id,
        spaceId,
        memo: memo || null,
        tasteScore: validScore,
        // 태그 선택 저장은 플래그 뒤로 보존 — 나중에 재사용 가능
        ...(ENABLE_RECORD_TAG_SELECTION && tags?.length > 0
          ? { tags: { create: tags.map((tag: TagKey) => ({ tag })) } }
          : {}),
      },
    });
    return { record: created, isNew: true };
  }, { maxWait: 5000, timeout: 8000 });
  // maxWait: 트랜잭션 슬롯을 기다리는 시간. timeout: advisory lock 대기를 포함해 트랜잭션
  // 전체가 허용되는 시간 — 기본값(5000ms)은 극히 드문 다중 동시 요청(예: 같은 사용자가
  // 실수로 여러 탭에서 동시 제출) 상황에서 뒤쪽 요청이 대기 중 잘릴 수 있어 여유를 뒀다.
  // 정상적인 더블탭(요청 2개) 수준에서는 이 타임아웃에 걸릴 일이 없다.

  await recomputeSpaceKPI(spaceId);
  return NextResponse.json(record, { status: isNew ? 201 : 200 });
}
