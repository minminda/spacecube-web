import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStatus } from "@/lib/editorial/input";
import { badRequest, readJson, requireAdminApi, statusUpdate } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/** 발행 / 발행 취소(초안) / 보관 / 복원. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;

  const parsed = parseStatus(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);

  const current = await prisma.editorialSpace.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!current) return NextResponse.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });

  await prisma.editorialSpace.update({ where: { id }, data: statusUpdate(parsed.data, current.publishedAt) });
  return NextResponse.json({ ok: true, status: parsed.data });
}
