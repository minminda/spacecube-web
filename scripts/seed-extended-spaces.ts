/**
 * 시연 컬렉션 확장 공간 9곳 등록 (2026-10-24) — 원본: DB의 비활성 운영 Space(isDemo) 행. 새 사진 업로드 · 새 소개문 작성 없음.
 *   npx tsx --env-file=.env scripts/seed-extended-spaces.ts             미리보기(DB 변경 없음, 기본)
 *   npx tsx --env-file=.env scripts/seed-extended-spaces.ts --apply     등록(EditorialSpace 새 행만 추가, 같은 slug가 있으면 건너뜀 — 재실행 안전)
 *   npx tsx --env-file=.env scripts/seed-extended-spaces.ts --archive   되돌리기 1단계: demo-ext-* 공간을 ARCHIVED로(공개에서 사라짐 · 데이터 삭제 없음, status=PUBLISHED로 복원 가능)
 *   npx tsx --env-file=.env scripts/seed-extended-spaces.ts --delete    되돌리기 2단계: 저장 · 기록 · 큐레이션 연결이 하나도 없는 demo-ext-* 행만 삭제(참조가 있으면 건드리지 않음)
 * 복원 · 영향 정리: docs/extended-spaces-2026-10-24.md
 */
import { PrismaClient } from "@prisma/client";
import { EXTENDED_SPACE_PLAN, usableDescription } from "../src/lib/home/extendedSpaceSeeds";

const prisma = new PrismaClient();
const has = (f: string) => process.argv.includes(f);
const APPLY = has("--apply"), ARCHIVE = has("--archive"), DELETE = has("--delete");

async function main() {
  const host = (() => { try { return new URL(process.env.DATABASE_URL ?? "").host; } catch { return "(알 수 없음)"; } })();
  console.log(`대상 DB host: ${host}  모드: ${APPLY ? "등록(--apply)" : ARCHIVE ? "보관(--archive)" : DELETE ? "삭제(--delete)" : "미리보기(DB 변경 없음)"}`);

  if (ARCHIVE || DELETE) {
    const rows = await prisma.editorialSpace.findMany({
      where: { slug: { startsWith: "demo-ext-" }, isDemo: true },
      select: { id: true, slug: true, name: true, status: true, _count: { select: { saves: true, archiveEntries: true, profileSpaces: true, curationLinks: true, personLinks: true, thoughtLinks: true } } },
    });
    for (const r of rows) {
      const refs = Object.values(r._count).reduce((a, b) => a + b, 0);
      if (ARCHIVE) { await prisma.editorialSpace.update({ where: { id: r.id }, data: { status: "ARCHIVED" } }); console.log(`보관  ${r.slug} ${r.name} (참조 ${refs})`); continue; }
      if (refs > 0) { console.log(`건너뜀 ${r.slug} ${r.name} — 저장 · 기록 · 연결 ${refs}건이 있어 삭제하지 않음(--archive 사용)`); continue; }
      await prisma.editorialSpace.delete({ where: { id: r.id } });
      console.log(`삭제  ${r.slug} ${r.name}`);
    }
    return;
  }

  const activeTags = new Set((await prisma.tag.findMany({ where: { isActive: true }, select: { name: true } })).map((t) => t.name));
  const bad = EXTENDED_SPACE_PLAN.flatMap((p) => p.tags.filter((t) => !activeTags.has(t)).map((t) => `${p.slug}: 태그 "${t}" 정본에 없음`));
  if (bad.length) { console.error("정본 불일치 — 중단:\n" + bad.join("\n")); process.exit(1); }

  const base = new Date("2026-10-23T03:00:00Z").getTime();
  let created = 0, skipped = 0;
  for (const [i, p] of EXTENDED_SPACE_PLAN.entries()) {
    const src = await prisma.space.findUnique({ where: { slug: p.srcSlug }, select: { name: true, tagline: true, description: true, location: true, openingHours: true, naverMapUrl: true, imageUrl: true } });
    if (!src || !src.imageUrl?.startsWith("https://")) { console.log(`건너뜀  ${p.slug} — 원본 운영 Space(${p.srcSlug})가 없거나 대표 사진이 없음`); skipped++; continue; }
    const exists = await prisma.editorialSpace.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists) { console.log(`건너뜀  ${p.slug} (이미 있음)`); skipped++; continue; }
    const name = src.name.trim();
    const description = usableDescription(src.description);
    console.log(`등록    ${p.slug}  ${name} · ${p.area} · ${p.category} · [${p.tags.join(", ")}]  ← Space.${p.srcSlug}${description ? "" : "  (소개문 없음: 인사말뿐)"}`);
    if (APPLY) {
      await prisma.editorialSpace.create({
        data: {
          slug: p.slug, name, area: p.area, category: p.category, summary: src.tagline?.trim() || null, description,
          coverImage: src.imageUrl, images: [], tags: p.tags, address: src.location?.trim() || null, openingHours: src.openingHours?.trim() || null, mapUrl: src.naverMapUrl?.trim() || null,
          cubeAvailable: false, story: [], isDemo: true, status: "PUBLISHED", publishedAt: new Date(base + i * 60_000),
        },
      });
    }
    created++;
  }
  console.log(`\n요약: 등록 ${created} · 건너뜀 ${skipped}${APPLY ? "" : "  (미리보기 — 적용하려면 --apply)"}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
