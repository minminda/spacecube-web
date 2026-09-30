/**
 * 홈페이지 정적 콘텐츠(src/content/*) → Editorial CMS DB 일회성 이관 + 검증.
 *
 * - 안전: 새 editorial_* 테이블에만 쓴다. 기존 Cube 운영 테이블(Space/Cube/Episode/...)은 읽지도 쓰지도 않는다.
 * - idempotent: 공간·큐레이션·피플은 slug, 홈 설정은 id="home" 기준 upsert. 이미 있으면 **덮어쓰지 않는다**
 *   (update: {}) — CMS에서 관리자가 수정한 내용을 재실행이 되돌리지 않도록. 연결 공간은 큐레이션/피플을
 *   이번 실행에서 새로 만들었을 때만 넣는다.
 * - 상태: 공간 콘텐츠 = PUBLISHED, 큐레이션·피플 = DRAFT(임시 원고).
 * - 끝에 정적 데이터와 DB를 대조해 개수·주요 필드가 다르면 비정상 종료한다.
 *
 * 실행: npm run db:seed-editorial
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { SPACES, resolveImage } from "../src/content/spaces";
import { CURATIONS } from "../src/content/curations";
import { PEOPLE } from "../src/content/people";
import { FEATURED_CURATION_SLUG, FEATURED_SPACE_SLUGS, HERO_IMAGE_SPACE_SLUG, LATEST_FEED } from "../src/content/site";
import type { ContentBlock, ImageRef } from "../src/content/types";
import { parseBlocks } from "../src/lib/editorial/input";
import type { BlockImage, EditorialBlock, HomeFeedItem } from "../src/lib/editorial/types";

const prisma = new PrismaClient();

function blockImage(ref: ImageRef): BlockImage | null {
  const r = resolveImage(ref);
  if (!r.src) return null;
  const img: BlockImage = { url: r.src };
  if (ref.alt) img.alt = ref.alt;
  if (ref.caption) img.caption = ref.caption;
  return img;
}

function convertBlocks(blocks: ContentBlock[], spaceIdBySlug: Map<string, string>): EditorialBlock[] {
  const out: EditorialBlock[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "TEXT": out.push({ type: "TEXT", text: b.text }); break;
      case "CAPTION": out.push({ type: "TEXT", text: b.text, small: true }); break;
      case "HEADING": out.push({ type: "HEADING", text: b.text }); break;
      case "QUOTE": out.push(b.cite ? { type: "QUOTE", text: b.text, cite: b.cite } : { type: "QUOTE", text: b.text }); break;
      case "QNA": out.push({ type: "QNA", items: b.items }); break;
      case "DIVIDER": out.push({ type: "DIVIDER" }); break;
      case "IMAGE": { const img = blockImage(b.image); if (img) out.push(b.wide ? { type: "IMAGE", image: img, wide: true } : { type: "IMAGE", image: img }); break; }
      case "IMAGE_GALLERY": { const imgs = b.images.flatMap((r) => blockImage(r) ?? []); if (imgs.length) out.push({ type: "GALLERY", images: imgs }); break; }
      case "IMAGE_TEXT": { const img = blockImage(b.image); if (img) out.push({ type: "IMAGE_TEXT", image: img, text: b.text, ...(b.reverse ? { reverse: true } : {}) }); break; }
      case "SPACE_CARD": { const id = spaceIdBySlug.get(b.spaceSlug); if (id) out.push(b.note ? { type: "SPACE_CARD", spaceId: id, note: b.note } : { type: "SPACE_CARD", spaceId: id }); break; }
    }
  }
  // 저장 전 CMS와 같은 검증을 통과해야 한다.
  const parsed = parseBlocks(out);
  if (!parsed.ok) throw new Error(`블록 변환 결과가 검증을 통과하지 못함: ${parsed.error}`);
  return parsed.data;
}

async function main() {
  const now = new Date();
  const log: string[] = [];

  // ── 1. 공간 콘텐츠 (PUBLISHED)
  for (const s of SPACES) {
    const existed = await prisma.editorialSpace.findUnique({ where: { slug: s.slug }, select: { id: true } });
    await prisma.editorialSpace.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug, name: s.name, area: s.area, category: s.category,
        summary: s.summary ?? null, description: s.description?.join("\n\n") ?? null,
        coverImage: s.coverImage ?? null, coverPosition: s.coverPosition ?? null,
        images: s.images ?? [], tags: s.tags ?? [],
        address: s.address ?? null, openingHours: s.hours ?? null, mapUrl: s.mapUrl ?? null,
        instagram: s.instagram ?? null, website: s.website ?? null,
        cubeAvailable: s.cubeAvailable, status: "PUBLISHED", publishedAt: now,
      },
    });
    log.push(`space   ${existed ? "유지" : "생성"}  ${s.slug}`);
  }
  const spaceRows = await prisma.editorialSpace.findMany({ where: { slug: { in: SPACES.map((s) => s.slug) } }, select: { id: true, slug: true } });
  const spaceIdBySlug = new Map(spaceRows.map((r) => [r.slug, r.id]));

  // ── 2. 큐레이션 (DRAFT)
  for (const c of CURATIONS) {
    const existed = await prisma.editorialCuration.findUnique({ where: { slug: c.slug }, select: { id: true } });
    if (existed) { log.push(`curation 유지  ${c.slug}`); continue; }
    const numberTaken = await prisma.editorialCuration.findUnique({ where: { number: c.number }, select: { slug: true } });
    if (numberTaken) { log.push(`curation 건너뜀 ${c.slug} — 번호 ${c.number}을(를) ${numberTaken.slug}이(가) 사용 중`); continue; }
    const cover = resolveImage(c.cover);
    await prisma.editorialCuration.create({
      data: {
        slug: c.slug, number: c.number, area: c.region, title: c.title, summary: c.summary,
        coverImage: cover.src, coverPosition: cover.position ?? null,
        blocks: convertBlocks(c.blocks, spaceIdBySlug) as unknown as Prisma.InputJsonValue,
        status: "DRAFT",
        spaces: { create: c.spaceSlugs.flatMap((slug, i) => { const id = spaceIdBySlug.get(slug); return id ? [{ spaceId: id, order: i }] : []; }) },
      },
    });
    log.push(`curation 생성  ${c.slug}`);
  }

  // ── 3. 피플 (DRAFT)
  for (const p of PEOPLE) {
    const existed = await prisma.editorialPerson.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existed) { log.push(`person  유지  ${p.slug}`); continue; }
    const numberTaken = await prisma.editorialPerson.findUnique({ where: { number: p.number }, select: { slug: true } });
    if (numberTaken) { log.push(`person  건너뜀 ${p.slug} — 번호 ${p.number} 사용 중`); continue; }
    const cover = resolveImage(p.cover);
    await prisma.editorialPerson.create({
      data: {
        slug: p.slug, number: p.number, title: p.title, subject: p.subject ?? null, summary: p.summary,
        coverImage: cover.src, coverPosition: cover.position ?? null,
        blocks: convertBlocks(p.blocks, spaceIdBySlug) as unknown as Prisma.InputJsonValue,
        status: "DRAFT",
        spaces: { create: p.spaceSlugs.flatMap((slug, i) => { const id = spaceIdBySlug.get(slug); return id ? [{ spaceId: id, order: i }] : []; }) },
      },
    });
    log.push(`person  생성  ${p.slug}`);
  }

  // ── 4. 홈 설정
  const curationIdBySlug = new Map((await prisma.editorialCuration.findMany({ select: { id: true, slug: true } })).map((r) => [r.slug, r.id]));
  const personIdBySlug = new Map((await prisma.editorialPerson.findMany({ select: { id: true, slug: true } })).map((r) => [r.slug, r.id]));
  const feed: HomeFeedItem[] = LATEST_FEED.flatMap((f): HomeFeedItem[] => {
    if (f.kind === "space") { const id = spaceIdBySlug.get(f.slug); return id ? [f.headline ? { kind: "space", id, headline: f.headline } : { kind: "space", id }] : []; }
    if (f.kind === "curation") { const id = curationIdBySlug.get(f.slug); return id ? [{ kind: "curation", id }] : []; }
    const id = personIdBySlug.get(f.slug);
    return id ? [{ kind: "person", id }] : [];
  });
  const homeExisted = await prisma.editorialHomeSettings.findUnique({ where: { id: "home" }, select: { id: true } });
  await prisma.editorialHomeSettings.upsert({
    where: { id: "home" },
    update: {},
    create: {
      id: "home",
      heroSpaceId: spaceIdBySlug.get(HERO_IMAGE_SPACE_SLUG) ?? null,
      featuredCurationId: curationIdBySlug.get(FEATURED_CURATION_SLUG) ?? null,
      featuredSpaceIds: FEATURED_SPACE_SLUGS.flatMap((s) => spaceIdBySlug.get(s) ?? []),
      feed: feed as unknown as Prisma.InputJsonValue,
    },
  });
  log.push(`home    ${homeExisted ? "유지" : "생성"}`);

  console.log(log.join("\n"));

  // ── 5. 검증: 정적 데이터 ↔ DB
  const problems: string[] = [];
  const dbSpaces = await prisma.editorialSpace.findMany();
  for (const s of SPACES) {
    const d = dbSpaces.find((x) => x.slug === s.slug);
    if (!d) { problems.push(`공간 누락: ${s.slug}`); continue; }
    const pairs: [string, unknown, unknown][] = [
      ["name", s.name, d.name], ["area", s.area, d.area], ["category", s.category, d.category],
      ["summary", s.summary ?? null, d.summary], ["address", s.address ?? null, d.address],
      ["mapUrl", s.mapUrl ?? null, d.mapUrl], ["coverImage", s.coverImage ?? null, d.coverImage],
      ["cubeAvailable", s.cubeAvailable, d.cubeAvailable],
    ];
    for (const [k, a, b] of pairs) if (a !== b) problems.push(`공간 ${s.slug}.${k}: 정적="${a}" DB="${b}"`);
  }
  const dbCurations = await prisma.editorialCuration.findMany({ include: { spaces: { orderBy: { order: "asc" }, include: { space: { select: { slug: true } } } } } });
  for (const c of CURATIONS) {
    const d = dbCurations.find((x) => x.slug === c.slug);
    if (!d) { problems.push(`큐레이션 누락: ${c.slug}`); continue; }
    if (d.title !== c.title || d.area !== c.region || d.number !== c.number) problems.push(`큐레이션 ${c.slug} 기본 필드 불일치`);
    const linkSlugs = d.spaces.map((l) => l.space.slug).join(",");
    if (linkSlugs !== c.spaceSlugs.join(",")) problems.push(`큐레이션 ${c.slug} 연결 공간 불일치: 정적=${c.spaceSlugs.join(",")} DB=${linkSlugs}`);
    const blockCount = Array.isArray(d.blocks) ? d.blocks.length : -1;
    if (blockCount !== c.blocks.length) problems.push(`큐레이션 ${c.slug} 블록 수 불일치: 정적=${c.blocks.length} DB=${blockCount}`);
  }
  const dbPeople = await prisma.editorialPerson.findMany();
  for (const p of PEOPLE) {
    const d = dbPeople.find((x) => x.slug === p.slug);
    if (!d) { problems.push(`피플 누락: ${p.slug}`); continue; }
    if (d.title !== p.title || d.number !== p.number) problems.push(`피플 ${p.slug} 기본 필드 불일치`);
    const blockCount = Array.isArray(d.blocks) ? d.blocks.length : -1;
    if (blockCount !== p.blocks.length) problems.push(`피플 ${p.slug} 블록 수 불일치: 정적=${p.blocks.length} DB=${blockCount}`);
  }

  console.log("\n── 검증 ──");
  console.log(`공간     정적 ${SPACES.length} / DB ${dbSpaces.length} (발행 ${dbSpaces.filter((s) => s.status === "PUBLISHED").length})`);
  console.log(`큐레이션 정적 ${CURATIONS.length} / DB ${dbCurations.length} (초안 ${dbCurations.filter((c) => c.status === "DRAFT").length})`);
  console.log(`피플     정적 ${PEOPLE.length} / DB ${dbPeople.length} (초안 ${dbPeople.filter((p) => p.status === "DRAFT").length})`);
  const home = await prisma.editorialHomeSettings.findUnique({ where: { id: "home" } });
  console.log(`홈 설정  hero=${home?.heroSpaceId ? "O" : "X"} 대표큐레이션=${home?.featuredCurationId ? "O" : "X"} 둘러보기=${home?.featuredSpaceIds.length ?? 0}곳 피드=${Array.isArray(home?.feed) ? (home?.feed as unknown[]).length : 0}개`);
  if (problems.length) {
    console.error("\n불일치:\n" + problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("\n✓ 정적 데이터와 DB가 일치합니다.");
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
