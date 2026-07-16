import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { isTranslatableLocale } from "@/lib/locales";
import { ENABLE_MULTILINGUAL } from "@/lib/pilotFlags";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Props) {
  if (!ENABLE_MULTILINGUAL) {
    return NextResponse.json({ error: "현재 다국어 기능을 사용할 수 없습니다.", code: "MULTILINGUAL_DISABLED" }, { status: 403 });
  }
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { multilingualEnabled?: boolean; supportedLocales?: string[] };
  const multilingualEnabled = !!body.multilingualEnabled;

  const requestedLocales = Array.isArray(body.supportedLocales) ? body.supportedLocales : [];
  const invalid = requestedLocales.filter((l) => !isTranslatableLocale(l));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `지원하지 않는 언어입니다: ${invalid.join(", ")}` }, { status: 400 });
  }
  // 한 언어를 여러 번 보내도 한 번만 저장
  const supportedLocales = [...new Set(requestedLocales)];

  const updated = await prisma.space.update({
    where: { id },
    data: { multilingualEnabled, supportedLocales },
    select: { multilingualEnabled: true, supportedLocales: true },
  });

  return NextResponse.json(updated);
}
