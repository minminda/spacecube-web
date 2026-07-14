import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, ClusterType, GuestbookSessionStatus } from "@prisma/client";
import { recomputeSpaceKPI } from "@/lib/kpi";
import { canWriteToSession, canWriteNoteForVisit, getVisibleClusters } from "@/lib/guestbookSession";
import { hasCollision, clusterLabelRect, POST_IT_WIDTH, POST_IT_HEIGHT, POST_IT_GAP, type Rect } from "@/lib/postitCollision";

const MAX_CONTENT = 80;
const DEFAULT_COLOR = "#F6E7A8"; // 관리자 설정이 없을 때 기본 노란 포스트잇
const VALID_CLUSTER_TYPES: string[] = [ClusterType.FREE, ClusterType.QUESTION_1, ClusterType.QUESTION_2];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId, content, x, y, rotation, imageUrl, clusterType } = await req.json();

  const text = typeof content === "string" ? content.trim() : "";
  if (!spaceId || !text) {
    return NextResponse.json({ error: "spaceId and content are required" }, { status: 400 });
  }
  if (text.length > MAX_CONTENT) {
    return NextResponse.json({ error: `content must be ${MAX_CONTENT} characters or less` }, { status: 400 });
  }
  if (typeof x !== "number" || typeof y !== "number" || !isFinite(x) || !isFinite(y)) {
    return NextResponse.json({ error: "x and y coordinates are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!user.nickname) {
    return NextResponse.json({ error: "닉네임을 먼저 설정해주세요.", code: "NICKNAME_REQUIRED" }, { status: 400 });
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, guestbookSettings: { select: { defaultPostitColor: true } } },
  });
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  // 방문 단위 식별자 — 이 공간에 대해 가장 최근에 "인정된 방문"(Record, isNewVisit 정책 기준)이
  // 곧 이번 방문이다. 기록을 완료해야 방명록에 흔적을 남길 수 있음.
  const currentVisit = await prisma.record.findFirst({
    where: { userId: user.id, spaceId },
    orderBy: { visitedAt: "desc" },
  });
  if (!currentVisit) {
    return NextResponse.json({ error: "이 공간에 대한 기록을 먼저 남겨주세요." }, { status: 403 });
  }

  // 방문자가 sessionId를 직접 지정하지 않는다 — 서버에서 이 공간의 현재 ACTIVE 세션을 조회한다.
  const activeSession = await prisma.guestbookSession.findFirst({
    where: { spaceId, status: GuestbookSessionStatus.ACTIVE },
  });
  if (!activeSession || !canWriteToSession(activeSession.status)) {
    return NextResponse.json({ error: "현재 진행 중인 방명록이 없습니다." }, { status: 403 });
  }

  // clusterType은 벽이 아니라 메타데이터 — 다만 세션에 실제로 없는 질문을 가리키면 자유 군집으로 강등한다.
  let resolvedClusterType: ClusterType = ClusterType.FREE;
  if (clusterType === ClusterType.QUESTION_1 && activeSession.question1) {
    resolvedClusterType = ClusterType.QUESTION_1;
  } else if (clusterType === ClusterType.QUESTION_2 && activeSession.question2) {
    resolvedClusterType = ClusterType.QUESTION_2;
  } else if (VALID_CLUSTER_TYPES.includes(clusterType)) {
    resolvedClusterType = ClusterType.FREE;
  }

  try {
    const note = await prisma.$transaction(async (tx) => {
      // 한 번의 방문은 하나의 흔적만 — 같은 세션 안에서도 이번 방문(recordId)으로는 이미 썼는지 확인.
      // UI에서도 막지만 동시 요청/새로고침 대비 서버에서도 다시 확인한다.
      const existingForVisit = await tx.guestbookNote.findFirst({
        where: { userId: user.id, guestbookSessionId: activeSession.id, recordId: currentVisit.id },
        select: { id: true },
      });
      if (!canWriteNoteForVisit(activeSession.status, !!existingForVisit)) {
        throw new VisitAlreadyPostedError();
      }

      // 좌표 충돌 검사 — 현재 세션에 렌더링되는 모든 포스트잇 + 군집 라벨(고정 오브젝트) 기준.
      const sessionNotes = await tx.guestbookNote.findMany({
        where: { guestbookSessionId: activeSession.id },
        select: { x: true, y: true },
      });
      const obstacles: Rect[] = [
        ...sessionNotes.map((n) => ({ x: n.x, y: n.y, width: POST_IT_WIDTH, height: POST_IT_HEIGHT })),
        ...getVisibleClusters(activeSession).map((c) => clusterLabelRect(c)),
      ];
      const requestedRect: Rect = { x, y, width: POST_IT_WIDTH, height: POST_IT_HEIGHT };
      if (hasCollision(requestedRect, obstacles, POST_IT_GAP)) {
        throw new PositionOccupiedError();
      }

      return tx.guestbookNote.create({
        data: {
          userId: user.id,
          spaceId,
          guestbookSessionId: activeSession.id,
          recordId: currentVisit.id,
          clusterType: resolvedClusterType,
          content: text,
          nickname: user.nickname,
          imageUrl: typeof imageUrl === "string" && imageUrl ? imageUrl : null,
          x,
          y,
          rotation: typeof rotation === "number" && isFinite(rotation) ? rotation : 0,
          color: space.guestbookSettings?.defaultPostitColor ?? DEFAULT_COLOR,
        },
      });
    });

    await recomputeSpaceKPI(spaceId);

    // 포스트잇 저장은 여기서 완결된다 — 추천/취향 업데이트 요약은 더 이상 이 시점에 강제로
    // 계산·노출하지 않는다. 방문자가 캔버스를 계속 둘러본 뒤 "다음으로"를 눌렀을 때만
    // /api/guestbook/reward에서 별도로 계산한다(방명록 작성은 선택, 추천은 기록의 결과).
    return NextResponse.json(
      {
        id: note.id,
        userId: note.userId,
        content: note.content,
        nickname: note.nickname,
        imageUrl: note.imageUrl,
        x: note.x,
        y: note.y,
        rotation: note.rotation,
        color: note.color,
        clusterType: note.clusterType,
        createdAt: note.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof VisitAlreadyPostedError) {
      return NextResponse.json(
        { error: "이번 방문에 이미 흔적을 남기셨어요.", code: "VISIT_ALREADY_POSTED" },
        { status: 409 },
      );
    }
    if (err instanceof PositionOccupiedError) {
      return NextResponse.json(
        { error: "이미 다른 흔적이 있는 자리예요.", code: "POSTIT_POSITION_OCCUPIED" },
        { status: 409 },
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "이번 방문에 이미 흔적을 남기셨어요.", code: "VISIT_ALREADY_POSTED" },
        { status: 409 },
      );
    }
    throw err;
  }
}

// 트랜잭션 내부에서 던져 바깥 catch에서 상태 코드를 구분하기 위한 표식용 에러
class VisitAlreadyPostedError extends Error {}
class PositionOccupiedError extends Error {}
