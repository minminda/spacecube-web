import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStatus } from "@/lib/editorial/input";
import { badRequest, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/** 큐레이터 컬렉션 공개 상태 변경(발행/초안/보관). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;
  const parsed = parseStatus(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);
  const found = await prisma.curatorCollection.findUnique({ where: { id }, select: { id: true } });
  if (!found) return NextResponse.json({ error: "컬렉션을 찾을 수 없어요." }, { status: 404 });
  await prisma.curatorCollection.update({ where: { id }, data: { status: parsed.data } });
  return NextResponse.json({ ok: true, status: parsed.data });
}
