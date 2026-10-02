/**
 * Editorial CMS 초기 데이터 seed + 검증.
 *
 * 1) 공간 콘텐츠(EditorialSpace) — 현재 운영 DB의 공개 공간(Space, isActive)을 **읽기만 해서** 공개 가능한
 *    기본 정보만 복사한 별도 데이터를 만든다. 두 데이터는 DB 관계가 없고 이후 독립적으로 관리된다.
 *    가져오는 것: 이름·slug·지역·공간 유형·한 줄 소개(tagline)·주소·대표 이미지(+초점)·지도 링크·운영시간·Cube 설치 여부.
 *    가져오지 않는 것: Episode/Scene·운영자 소개/인터뷰·방명록·Record·KPI·운영자 연락처/PIN 등 비공개 정보.
 *    → PUBLISHED로 만든다.
 * 2) 큐레이션·PEOPLE 테스트 콘텐츠 — src/content/ 의 임시 원고(실제 공간 연결, 사실 서술 없음) → DRAFT.
 *
 * - 안전: editorial_* 테이블에만 쓴다. 운영 테이블은 조회만 한다(쓰기·삭제 없음).
 * - 최초 이관 전용: 각 유형(공간/큐레이션/피플)은 해당 테이블이 비어 있을 때만 만든다. 한 번이라도 데이터가
 *   생긴 뒤에는 그 유형을 건너뛴다 — 재실행해도 CMS에서 slug를 바꾼 공간이 옛 slug로 중복 생성되거나,
 *   영구 삭제한 공간이 PUBLISHED로 되살아나거나, 새 운영 공간이 검토 없이 자동 발행되는 일이 없다.
 * - 같은 실행 안에서는 slug 기준 upsert(update: {})라 중복 생성되지 않는다.
 * - 이번 실행에서 만든 유형만 운영 DB·정적 원고와 대조해 다르면 비정상 종료한다.
 *
 * 실행: npm run db:seed-editorial
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveSpaceTypeLabel } from "../src/lib/spaceType";
import { resolveImage } from "../src/content/spaces";
import { CURATIONS } from "../src/content/curations";
import { PEOPLE } from "../src/content/people";
import type { ContentBlock, ImageRef } from "../src/content/types";
import { parseBlocks } from "../src/lib/editorial/input";
import type { BlockImage, EditorialBlock } from "../src/lib/editorial/types";

const prisma = new PrismaClient();

/** 공개 홈페이지에 올리지 않는 운영 공간 — 시연 전용 공간(buk). */
const EXCLUDED_SPACE_SLUGS = new Set(["buk"]);

function blockImage(ref: ImageRef, coverBySlug: Map<string, string | null>): BlockImage | null {
  const url = ref.src ?? (ref.spaceSlug ? coverBySlug.get(ref.spaceSlug) ?? null : null) ?? resolveImage(ref).src;
  if (!url) return null;
  const img: BlockImage = { url };
  if (ref.alt) img.alt = ref.alt;
  if (ref.caption) img.caption = ref.caption;
  return img;
}

function convertBlocks(blocks: ContentBlock[], spaceIdBySlug: Map<string, string>, coverBySlug: Map<string, string | null>): EditorialBlock[] {
  const out: EditorialBlock[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "TEXT": out.push({ type: "TEXT", text: b.text }); break;
      case "CAPTION": out.push({ type: "TEXT", text: b.text, small: true }); break;
      case "HEADING": out.push({ type: "HEADING", text: b.text }); break;
      case "QUOTE": out.push(b.cite ? { type: "QUOTE", text: b.text, cite: b.cite } : { type: "QUOTE", text: b.text }); break;
      case "QNA": out.push({ type: "QNA", items: b.items }); break;
      case "DIVIDER": out.push({ type: "DIVIDER" }); break;
      case "IMAGE": { const img = blockImage(b.image, coverBySlug); if (img) out.push(b.wide ? { type: "IMAGE", image: img, wide: true } : { type: "IMAGE", image: img }); break; }
      case "IMAGE_GALLERY": { const imgs = b.images.flatMap((r) => blockImage(r, coverBySlug) ?? []); if (imgs.length) out.push({ type: "GALLERY", images: imgs }); break; }
      case "IMAGE_TEXT": { const img = blockImage(b.image, coverBySlug); if (img) out.push({ type: "IMAGE_TEXT", image: img, text: b.text, ...(b.reverse ? { reverse: true } : {}) }); break; }
      case "SPACE_CARD": { const id = spaceIdBySlug.get(b.spaceSlug); if (id) out.push(b.note ? { type: "SPACE_CARD", spaceId: id, note: b.note } : { type: "SPACE_CARD", spaceId: id }); break; }
    }
  }
  const parsed = parseBlocks(out);
  if (!parsed.ok) throw new Error(`블록 변환 결과가 검증을 통과하지 못함: ${parsed.error}`);
  return parsed.data;
}

async function main() {
  const now = new Date();
  const log: string[] = [];
  const opsSpaceCountBefore = await prisma.space.count();
  const [spacesInitial, curationsInitial, peopleInitial] = await Promise.all([
    prisma.editorialSpace.count().then((n) => n === 0),
    prisma.editorialCuration.count().then((n) => n === 0),
    prisma.editorialPerson.count().then((n) => n === 0),
  ]);

  // ── 1. 운영 공간 → 공간 콘텐츠 (PUBLISHED, 복사본)
  const opsSpaces = await prisma.space.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      slug: true, name: true, district: true, type: true, tagline: true, location: true,
      imageUrl: true, imagePositionX: true, imagePositionY: true, naverMapUrl: true, openingHours: true,
      cube: { select: { status: true } },
      spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
    },
  });
  const eligible = opsSpaces.filter((s) => !EXCLUDED_SPACE_SLUGS.has(s.slug));
  if (!spacesInitial) log.push("space    건너뜀 — 공간 콘텐츠가 이미 있음(최초 이관 전용). 새 공간은 CMS에서 직접 만드세요.");
  for (const s of spacesInitial ? eligible : []) {
    const existed = await prisma.editorialSpace.findUnique({ where: { slug: s.slug }, select: { id: true } });
    await prisma.editorialSpace.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        name: s.name,
        area: s.district?.trim() || s.location.split(" ").slice(0, 2).join(" "),
        category: resolveSpaceTypeLabel(s.spaceTagLinks, s.type),
        summary: s.tagline?.trim() || null,
        address: s.location || null,
        coverImage: s.imageUrl,
        coverPosition: s.imageUrl ? `${(s.imagePositionX ?? 0.5) * 100}% ${(s.imagePositionY ?? 0.5) * 100}%` : null,
        mapUrl: s.naverMapUrl?.startsWith("http") ? s.naverMapUrl : null,
        openingHours: s.openingHours?.trim() || null,
        cubeAvailable: s.cube?.status === "ASSIGNED",
        status: "PUBLISHED",
        publishedAt: now,
      },
    });
    log.push(`space    ${existed ? "유지" : "생성"}  ${s.slug} (${s.name})`);
  }
  for (const s of opsSpaces.filter((x) => EXCLUDED_SPACE_SLUGS.has(x.slug))) log.push(`space    제외  ${s.slug} (${s.name}) — 시연 전용`);

  const edSpaces = await prisma.editorialSpace.findMany({ select: { id: true, slug: true, coverImage: true } });
  const spaceIdBySlug = new Map(edSpaces.map((r) => [r.slug, r.id]));
  const coverBySlug = new Map(edSpaces.map((r) => [r.slug, r.coverImage]));

  // ── 2. 큐레이션 테스트 콘텐츠 (DRAFT)
  if (!curationsInitial) log.push("curation 건너뜀 — 큐레이션이 이미 있음(최초 이관 전용)");
  for (const c of curationsInitial ? CURATIONS : []) {
    const existed = await prisma.editorialCuration.findUnique({ where: { slug: c.slug }, select: { id: true } });
    if (existed) { log.push(`curation 유지  ${c.slug}`); continue; }
    const numberTaken = await prisma.editorialCuration.findUnique({ where: { number: c.number }, select: { slug: true } });
    if (numberTaken) { log.push(`curation 건너뜀 ${c.slug} — 번호 ${c.number} 사용 중(${numberTaken.slug})`); continue; }
    const cover = c.cover.spaceSlug ? coverBySlug.get(c.cover.spaceSlug) ?? null : c.cover.src ?? null;
    await prisma.editorialCuration.create({
      data: {
        slug: c.slug, number: c.number, area: c.region, title: c.title, summary: c.summary, coverImage: cover,
        blocks: convertBlocks(c.blocks, spaceIdBySlug, coverBySlug) as unknown as Prisma.InputJsonValue,
        status: "DRAFT",
        spaces: { create: c.spaceSlugs.flatMap((slug, i) => { const id = spaceIdBySlug.get(slug); return id ? [{ spaceId: id, order: i }] : []; }) },
      },
    });
    log.push(`curation 생성  ${c.slug}`);
  }

  // ── 3. PEOPLE 테스트 콘텐츠 (DRAFT, 실존 인물 서술 없음)
  if (!peopleInitial) log.push("person   건너뜀 — 피플이 이미 있음(최초 이관 전용)");
  for (const p of peopleInitial ? PEOPLE : []) {
    const existed = await prisma.editorialPerson.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existed) { log.push(`person   유지  ${p.slug}`); continue; }
    const numberTaken = await prisma.editorialPerson.findUnique({ where: { number: p.number }, select: { slug: true } });
    if (numberTaken) { log.push(`person   건너뜀 ${p.slug} — 번호 ${p.number} 사용 중`); continue; }
    await prisma.editorialPerson.create({
      data: {
        slug: p.slug, number: p.number, title: p.title, subject: p.subject ?? null, summary: p.summary, coverImage: null,
        blocks: convertBlocks(p.blocks, spaceIdBySlug, coverBySlug) as unknown as Prisma.InputJsonValue,
        status: "DRAFT",
        spaces: { create: p.spaceSlugs.flatMap((slug, i) => { const id = spaceIdBySlug.get(slug); return id ? [{ spaceId: id, order: i }] : []; }) },
      },
    });
    log.push(`person   생성  ${p.slug}`);
  }

  console.log(log.join("\n"));

  // ── 4. 검증
  const problems: string[] = [];
  const dbSpaces = await prisma.editorialSpace.findMany();
  for (const s of spacesInitial ? eligible : []) {
    const d = dbSpaces.find((x) => x.slug === s.slug);
    if (!d) { problems.push(`공간 콘텐츠 누락: ${s.slug}`); continue; }
    if (d.name !== s.name) problems.push(`공간 ${s.slug} 이름 다름: 운영="${s.name}" CMS="${d.name}" (CMS에서 수정했다면 정상)`);
    if (d.coverImage !== s.imageUrl) problems.push(`공간 ${s.slug} 대표 이미지 다름 (CMS에서 수정했다면 정상)`);
  }
  const dbCurations = await prisma.editorialCuration.findMany({ include: { spaces: { orderBy: { order: "asc" }, include: { space: { select: { slug: true } } } } } });
  for (const c of curationsInitial ? CURATIONS : []) {
    const d = dbCurations.find((x) => x.slug === c.slug);
    if (!d) { problems.push(`큐레이션 누락: ${c.slug}`); continue; }
    const linkSlugs = d.spaces.map((l) => l.space.slug).join(",");
    if (linkSlugs !== c.spaceSlugs.join(",")) problems.push(`큐레이션 ${c.slug} 연결 공간: 정적=${c.spaceSlugs.join(",")} CMS=${linkSlugs} (CMS에서 수정했다면 정상)`);
  }
  const dbPeople = await prisma.editorialPerson.findMany();
  for (const p of peopleInitial ? PEOPLE : []) if (!dbPeople.some((x) => x.slug === p.slug)) problems.push(`피플 누락: ${p.slug}`);
  if ((await prisma.space.count()) !== opsSpaceCountBefore) problems.push("운영 Space 개수가 바뀌었습니다(있어서는 안 됨)");

  console.log("\n── 검증 ──");
  console.log(`운영 공간(공개) ${opsSpaces.length}곳 중 대상 ${eligible.length}곳 → 공간 콘텐츠 ${dbSpaces.length}곳 (발행 ${dbSpaces.filter((s) => s.status === "PUBLISHED").length})`);
  console.log(`큐레이션 ${dbCurations.length} (초안 ${dbCurations.filter((c) => c.status === "DRAFT").length}) / 피플 ${dbPeople.length} (초안 ${dbPeople.filter((p) => p.status === "DRAFT").length})`);
  console.log(`운영 Space 개수 ${opsSpaceCountBefore} → ${await prisma.space.count()} (변화 없어야 함)`);
  if (problems.length) {
    console.error("\n확인 필요:\n" + problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("\n✓ 운영 공간·테스트 원고와 CMS 데이터가 일치합니다.");
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
