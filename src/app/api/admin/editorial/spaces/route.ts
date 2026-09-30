import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSpaceInput } from "@/lib/editorial/input";
import { badRequest, prismaErrorResponse, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/** 공간 콘텐츠 생성 — 항상 초안(DRAFT)으로 만든다. 발행은 status 라우트에서. */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const parsed = parseSpaceInput(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);

  try {
    const space = await prisma.editorialSpace.create({ data: { ...parsed.data, status: "DRAFT" }, select: { id: true } });
    return NextResponse.json({ id: space.id }, { status: 201 });
  } catch (e) {
    const res = prismaErrorResponse(e);
    if (res) return res;
    throw e;
  }
}
