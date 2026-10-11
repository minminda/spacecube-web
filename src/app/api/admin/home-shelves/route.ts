import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { badRequest, readJson, requireAdminApi } from "@/lib/editorial/adminApi";
import { BUILTIN_SHELVES, EDITORIAL_KEY_PREFIX, cleanTitle, nextShelfOrder, parseShelfSettings } from "@/lib/home/shelfConfig";

export const dynamic = "force-dynamic";

/** 편집 선반 생성 — 제목만으로 빈 선반을 만들고 맨 뒤에 둔다. 포함 공간은 편집 화면에서. */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const title = cleanTitle(((await readJson(req)) as { title?: unknown } | null)?.title as string | undefined);
  if (!title) return badRequest("선반 제목을 입력해주세요.");

  const rows = await prisma.homeShelf.findMany({ select: { order: true } });
  const id = randomUUID();
  await prisma.homeShelf.create({ data: { id, key: `${EDITORIAL_KEY_PREFIX}${id}`, kind: "EDITORIAL", title, visible: false, order: nextShelfOrder(rows) } });
  return NextResponse.json({ id }, { status: 201 });
}

/**
 * 전체 선반 노출 · 순서 · 제목 저장. 요청 배열의 순서가 곧 HOME 순서다.
 * SYSTEM / PERSONALIZED는 설정 행을 만들어(upsert) 저장하고, EDITORIAL은 기존 행을 갱신한다. 선반 내용은 건드리지 않는다.
 */
export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = await readJson(req);

  const editorial = await prisma.homeShelf.findMany({ where: { kind: "EDITORIAL" }, select: { key: true } });
  const parsed = parseShelfSettings(body, new Set(editorial.map((e) => e.key)));
  if (!parsed.ok) return badRequest(parsed.error);

  const builtin = new Map(BUILTIN_SHELVES.map((b) => [b.key, b]));
  await prisma.$transaction(
    parsed.items.map((it, i) => {
      const order = (i + 1) * 10;
      const b = builtin.get(it.key);
      if (b) {
        const title = b.titleEditable && it.title && it.title !== b.defaultTitle ? it.title : null;
        return prisma.homeShelf.upsert({
          where: { key: it.key },
          create: { key: it.key, kind: b.kind, title, visible: it.visible, order },
          update: { title, visible: it.visible, order },
        });
      }
      return prisma.homeShelf.update({ where: { key: it.key }, data: { title: it.title, visible: it.visible, order } });
    }),
  );
  return NextResponse.json({ ok: true });
}
