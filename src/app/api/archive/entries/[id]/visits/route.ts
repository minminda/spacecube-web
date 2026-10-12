import { NextResponse } from "next/server";
import { archiveCaller, archiveErrorResponse, photoGuard, readBody } from "@/lib/archive/apiAuth";
import { addVisit, undoRevisit, updateVisit } from "@/lib/archive/entries";
import { parseVisitInput, parseVisitPatch } from "@/lib/archive/input";

export const dynamic = "force-dynamic";

/** 다녀왔어요 / 또 갔어요 — 방문 1건 추가. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const parsed = parseVisitInput(await readBody(req), photoGuard(caller.userId));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    return NextResponse.json(await addVisit(caller.userId, id, parsed.data), { status: 201 });
  } catch (e) {
    return archiveErrorResponse(e);
  }
}

/** 방문 날짜·메모 고치기. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const parsed = parseVisitPatch(await readBody(req));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    await updateVisit(caller.userId, id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return archiveErrorResponse(e);
  }
}

/** 또 갔어요 취소 — 공간 상세에서 방금 남긴 재방문 1건만. 첫 방문 · 날짜/메모/사진을 더한 방문 · Cube 방문은 지우지 않는다. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const body = (await readBody(req)) as Record<string, unknown> | null;
  const visitId = typeof body?.visitId === "string" && body.visitId.length <= 64 ? body.visitId : null;
  if (!visitId) return NextResponse.json({ error: "취소할 방문을 알 수 없어요." }, { status: 400 });
  try {
    await undoRevisit(caller.userId, id, visitId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return archiveErrorResponse(e);
  }
}
