import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, readJson, requireAdminApi } from "@/lib/editorial/adminApi";
import { HOME_THEMES } from "@/lib/home/shelves";
import { parseKeywords, themeRuleKey } from "@/lib/home/themeRules";

export const dynamic = "force-dynamic";

/**
 * 테마 선반의 연결 키워드 저장. 테마 목록 · 제목 · 매칭 방식은 코드가 정하고, 운영자는 키워드만 바꾼다.
 * keywords가 비어 있으면(또는 기본값으로 되돌리기) 설정 행을 지워 코드 기본값으로 돌아간다. HomeShelf 행(key = theme:<키>)을 재사용하므로 스키마 변경이 없다.
 */
export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await readJson(req)) as { key?: unknown; keywords?: unknown } | null;
  const theme = HOME_THEMES.find((t) => t.key === body?.key);
  if (!theme) return badRequest("알 수 없는 테마예요. 새로고침해주세요.");
  const keywords = parseKeywords(Array.isArray(body?.keywords) ? (body?.keywords as string[]) : typeof body?.keywords === "string" ? body.keywords : null);
  const key = themeRuleKey(theme.key);

  if (keywords.length === 0 || JSON.stringify(keywords) === JSON.stringify(theme.keywords)) {
    await prisma.homeShelf.deleteMany({ where: { key } });
    return NextResponse.json({ ok: true, keywords: theme.keywords, customized: false });
  }
  await prisma.homeShelf.upsert({
    where: { key },
    create: { key, kind: "SYSTEM", visible: true, order: 0, description: keywords.join(", ") },
    update: { description: keywords.join(", ") },
  });
  return NextResponse.json({ ok: true, keywords, customized: true });
}
