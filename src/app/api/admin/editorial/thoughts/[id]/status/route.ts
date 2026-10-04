import { NextResponse } from "next/server";
import { parseStatus } from "@/lib/editorial/input";
import { applyStatus } from "@/lib/editorial/pipelineDb";
import { badRequest, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/** 발행 / 발행 취소(초안) / 보관 / 복원 — 발행은 완성 조건을 통과해야 하고, 제작 단계(stage)도 함께 맞춘다. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;

  const parsed = parseStatus(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);

  const res = await applyStatus("thoughts", id, parsed.data);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.code });
  return NextResponse.json({ ok: true, status: parsed.data });
}
