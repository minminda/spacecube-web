import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { previewDemoUsers } from "@/lib/demoData";
import { canFollow, normalizeHandle } from "@/lib/profile/publicProfile";

export const dynamic = "force-dynamic";

async function target(req: Request) {
  const body = (await req.json().catch(() => null)) as { handle?: unknown } | null;
  if (!body || typeof body.handle !== "string") return null;
  return prisma.user.findUnique({ where: { profileHandle: normalizeHandle(body.handle) }, select: { id: true, profilePublic: true, isDemo: true } });
}

/** 취향 따라가기 { handle } — 공개 프로필만, 자기 자신 불가, 중복은 unique + upsert로 한 번만. 관계는 기존 SavedTaste. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await target(req);
  const check = canFollow(session.user.id, t, previewDemoUsers(isAdmin(session.user.email)));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  await prisma.savedTaste.upsert({
    where: { userId_targetUserId: { userId: session.user.id, targetUserId: t!.id } },
    create: { userId: session.user.id, targetUserId: t!.id },
    update: {},
  });
  return NextResponse.json({ ok: true, following: true });
}

/** 취향 따라가기 해제 { handle } — 상대가 비공개로 바뀌었어도 해제는 항상 가능. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await target(req);
  if (t) await prisma.savedTaste.deleteMany({ where: { userId: session.user.id, targetUserId: t.id } });
  return NextResponse.json({ ok: true, following: false });
}
