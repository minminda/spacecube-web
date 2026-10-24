/**
 * 시연용 가상 공간 11곳 등록 + 실제 Partner 6곳의 빈 태그 채우기 (2026-10-24).
 *   npx tsx --env-file=.env scripts/seed-demo-spaces.ts            미리보기(DB 변경 없음, 기본)
 *   npx tsx --env-file=.env scripts/seed-demo-spaces.ts --apply    적용
 *
 * 하는 일(둘 다 추가 · 빈칸 채우기뿐 — 기존 값을 덮어쓰지 않는다):
 *  1) src/lib/home/demoSpaceSeeds.ts의 11곳을 EditorialSpace 새 행으로 만든다 — isDemo=true, slug 접두어 demo-, status PUBLISHED,
 *     cubeAvailable=false, story=[], 주소 · 지도 · 운영시간 없음. 같은 slug가 있으면 건너뜀(재실행 안전).
 *     Cube · Episode · Scene · 방명록 · 운영 Space · 운영자는 만들지 않는다.
 *  2) PARTNER_TAG_PLAN의 6곳은 tags가 비어 있을 때만 채운다(지역 · 주소 · 좌표 · 그 밖의 필드는 건드리지 않는다).
 * 복원: docs/demo-region-restore-2026-10.md
 */
import { PrismaClient } from "@prisma/client";
import { DEMO_SPACE_SEEDS, PARTNER_TAG_PLAN } from "../src/lib/home/demoSpaceSeeds";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const host = (() => { try { return new URL(process.env.DATABASE_URL ?? "").host; } catch { return "(알 수 없음)"; } })();
  console.log(`대상 DB host: ${host}  모드: ${APPLY ? "적용(--apply)" : "미리보기(DB 변경 없음)"}`);

  const activeTags = new Set((await prisma.tag.findMany({ where: { isActive: true }, select: { name: true } })).map((t) => t.name));
  const typeTags = new Set((await prisma.tag.findMany({ where: { isActive: true, categoryRef: { name: "공간 유형" } }, select: { name: true } })).map((t) => t.name));
  const bad: string[] = [];
  for (const s of DEMO_SPACE_SEEDS) {
    for (const t of s.tags) if (!activeTags.has(t)) bad.push(`${s.slug}: 태그 "${t}" 정본에 없음`);
    if (!typeTags.has(s.category)) bad.push(`${s.slug}: 유형 "${s.category}" 정본에 없음`);
  }
  for (const [slug, p] of Object.entries(PARTNER_TAG_PLAN)) for (const t of p.tags) if (!activeTags.has(t)) bad.push(`${slug}: 태그 "${t}" 정본에 없음`);
  if (bad.length) { console.error("정본 불일치 — 중단:\n" + bad.join("\n")); process.exit(1); }

  const base = new Date("2026-10-24T03:00:00Z").getTime();
  let created = 0, skipped = 0;
  for (const [i, s] of DEMO_SPACE_SEEDS.entries()) {
    const exists = await prisma.editorialSpace.findUnique({ where: { slug: s.slug }, select: { id: true, isDemo: true } });
    if (exists) { console.log(`건너뜀  ${s.slug} (이미 있음${exists.isDemo ? "" : " — isDemo=false 행이라 건드리지 않음"})`); skipped++; continue; }
    console.log(`등록    ${s.slug}  ${s.name} · ${s.area} · ${s.category} · [${s.tags.join(", ")}]`);
    if (APPLY) {
      await prisma.editorialSpace.create({
        data: {
          slug: s.slug, name: s.name, area: s.area, category: s.category, summary: s.summary, description: s.description.join("\n\n"),
          coverImage: s.image, images: [], tags: s.tags, cubeAvailable: false, story: [], isDemo: true, status: "PUBLISHED",
          publishedAt: new Date(base + i * 60_000),
        },
      });
    }
    created++;
  }

  let tagged = 0, kept = 0;
  for (const [slug, p] of Object.entries(PARTNER_TAG_PLAN)) {
    const row = await prisma.editorialSpace.findUnique({ where: { slug }, select: { id: true, tags: true, isDemo: true } });
    if (!row || row.isDemo) { console.log(`Partner ${slug}: 공개 공간 행이 없어 건너뜀`); continue; }
    if (row.tags.length > 0) { console.log(`Partner ${slug}: 이미 태그 있음(${row.tags.join(", ")}) — 유지`); kept++; continue; }
    console.log(`태그    ${slug}: [${p.tags.join(", ")}]  (근거: ${p.basis})`);
    if (APPLY) await prisma.editorialSpace.update({ where: { id: row.id }, data: { tags: p.tags } });
    tagged++;
  }
  console.log(`\n요약: 공간 등록 ${created} · 건너뜀 ${skipped} · Partner 태그 채움 ${tagged} · 유지 ${kept}${APPLY ? "" : "  (미리보기 — 적용하려면 --apply)"}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
