import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collectBlockSpaceIds, parseCurationInput } from "@/lib/editorial/input";
import { badRequest, missingSpaceIds, prismaErrorResponse, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/** 큐레이션 생성 — 항상 초안(DRAFT)으로 만든다. 연결 공간은 입력 순서대로 order를 매긴다. */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const parsed = parseCurationInput(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);
  const { spaces, blocks, ...data } = parsed.data;

  const missing = await missingSpaceIds([...spaces.map((s) => s.spaceId), ...collectBlockSpaceIds(blocks)]);
  if (missing) return badRequest(missing);

  try {
    const created = await prisma.editorialCuration.create({
      data: {
        ...data,
        blocks: blocks as unknown as Prisma.InputJsonValue,
        status: "DRAFT",
        spaces: { create: spaces.map((s, i) => ({ spaceId: s.spaceId, note: s.note, order: i })) },
      },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    const res = prismaErrorResponse(e);
    if (res) return res;
    throw e;
  }
}
