import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, prismaErrorResponse, readJson, requireAdminApi } from "@/lib/editorial/adminApi";
import { isValidSlug, normalizeSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

/**
 * 기존 사용자에게 큐레이터 프로필을 붙인다 — 큐레이터는 별도 계정이 아니라 "프로필을 가진 User"다.
 * 항상 초안(DRAFT)으로 만들고, 실제 사용자이므로 isDemo=false(가상 큐레이터는 seed 스크립트만 만든다).
 * body: { identifier(이메일 또는 닉네임), slug, name, bio, tasteTags?: string[] }
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await readJson(req)) as Record<string, unknown> | null;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const identifier = str(body?.identifier, 200);
  const slug = normalizeSlug(str(body?.slug, 80));
  const name = str(body?.name, 40);
  const bio = str(body?.bio, 200);
  const tasteTags = Array.isArray(body?.tasteTags) ? [...new Set((body!.tasteTags as unknown[]).filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean))].slice(0, 6) : [];
  if (!identifier || !name || !bio) return badRequest("사용자(이메일 또는 닉네임), 이름, 한 줄 소개를 입력해주세요.");
  if (!isValidSlug(slug)) return badRequest("주소(slug)는 영문 소문자·숫자·하이픈만 쓸 수 있어요.");

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: { equals: identifier, mode: "insensitive" } }, { nickname: identifier }] },
    select: { id: true, isDemo: true, curatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "이메일 또는 닉네임이 정확히 일치하는 사용자가 없어요." }, { status: 404 });
  if (user.curatorProfile) return NextResponse.json({ error: "이 사용자는 이미 큐레이터 프로필이 있어요." }, { status: 409 });

  try {
    const created = await prisma.curatorProfile.create({
      data: { userId: user.id, slug, name, bio, tasteTags, status: "DRAFT", isDemo: user.isDemo },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    const res = prismaErrorResponse(e);
    if (res) return res;
    throw e;
  }
}
