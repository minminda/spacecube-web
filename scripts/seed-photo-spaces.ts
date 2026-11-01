/**
 * 전시용 사진 공간 8곳 등록 (2026-11-01) — 받은 사진 7장 → demo-photo-* 가상 공간 7곳 + 뮤직컴플렉스(기존 운영 Space 정보) demo-ext-music-complex.
 *   npx tsx --env-file=.env scripts/seed-photo-spaces.ts --src <사진 폴더(1.jpg~8.jpg)>            미리보기(DB 변경 · 업로드 없음)
 *   npx tsx --env-file=.env scripts/seed-photo-spaces.ts --src <폴더> --apply                      Cloudinary 업로드 + EditorialSpace 새 행 추가(이미 있는 slug는 건너뜀 · 재실행 안전)
 *   npx tsx --env-file=.env scripts/seed-photo-spaces.ts --archive                                  되돌리기: 이 스크립트가 만든 행을 ARCHIVED로(삭제 없음)
 * 기존 운영 Space · 기록 · 저장은 읽기만 한다.
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PHOTO_SPACE_PLAN, MUSIC_COMPLEX_PLAN } from "../src/lib/home/photoSpaceSeeds";
import { usableDescription } from "../src/lib/home/extendedSpaceSeeds";

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ARCHIVE = argv.includes("--archive");
const srcDir = argv.includes("--src") ? argv[argv.indexOf("--src") + 1] : null;

async function upload(file: string, publicId: string): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!, key = process.env.CLOUDINARY_API_KEY!, secret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `overwrite=false&public_id=${publicId}&timestamp=${timestamp}`; // 알파벳순
  const signature = createHash("sha1").update(toSign + secret).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([readFileSync(file)], { type: "image/jpeg" }), "photo.jpg");
  form.append("public_id", publicId);
  form.append("overwrite", "false");
  form.append("timestamp", String(timestamp));
  form.append("api_key", key);
  form.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !json.secure_url) throw new Error(`업로드 실패 ${publicId}: ${json.error?.message ?? res.status}`);
  return json.secure_url;
}

async function main() {
  const host = (() => { try { return new URL(process.env.DATABASE_URL ?? "").host; } catch { return "(알 수 없음)"; } })();
  console.log(`대상 DB host: ${host}  모드: ${APPLY ? "적용(--apply)" : ARCHIVE ? "보관(--archive)" : "미리보기(변경 없음)"}`);
  const slugs = [...PHOTO_SPACE_PLAN.map((p) => p.slug), MUSIC_COMPLEX_PLAN.slug];

  if (ARCHIVE) {
    const r = await prisma.editorialSpace.updateMany({ where: { slug: { in: slugs }, isDemo: true }, data: { status: "ARCHIVED" } });
    console.log(`보관 ${r.count}곳`);
    return;
  }

  const activeTags = new Set((await prisma.tag.findMany({ where: { isActive: true }, select: { name: true } })).map((t) => t.name));
  const bad = [...PHOTO_SPACE_PLAN, MUSIC_COMPLEX_PLAN].flatMap((p) => p.tags.filter((t) => !activeTags.has(t)).map((t) => `${p.slug}: 태그 "${t}" 정본에 없음`));
  if (bad.length) throw new Error("정본 불일치 — 중단:\n" + bad.join("\n"));
  if (APPLY && !srcDir) throw new Error("--src <사진 폴더> 필요");

  const names = new Set((await prisma.editorialSpace.findMany({ select: { name: true } })).map((e) => e.name.trim()));
  const base = new Date("2026-10-24T03:00:00Z").getTime();
  let created = 0, skipped = 0;

  for (const [i, p] of PHOTO_SPACE_PLAN.entries()) {
    if (await prisma.editorialSpace.findUnique({ where: { slug: p.slug }, select: { id: true } })) { console.log(`건너뜀  ${p.slug} (이미 있음)`); skipped++; continue; }
    if (names.has(p.name)) { console.log(`건너뜀  ${p.slug} — 같은 이름 "${p.name}"이 이미 있음`); skipped++; continue; }
    console.log(`등록    ${p.slug}  "${p.name}" · ${p.area} · ${p.category} · [${p.tags.join(", ")}]  <- 사진 ${p.photo}.jpg`);
    if (APPLY) {
      const cover = await upload(`${srcDir}/${p.photo}.jpg`, `gonggancube/demo-photo/${p.slug}`);
      await prisma.editorialSpace.create({
        data: { slug: p.slug, name: p.name, area: p.area, category: p.category, summary: p.summary, description: null, coverImage: cover, coverPosition: p.position ?? null, images: [], tags: p.tags, address: null, openingHours: null, mapUrl: null, cubeAvailable: false, story: [], isDemo: true, status: "PUBLISHED", publishedAt: new Date(base + (20 + i) * 60_000) },
      });
    }
    created++;
  }

  // 뮤직컴플렉스 — 이미 등록된 운영 Space 정보(소개문 · 주소 · 운영시간 · 지도)를 그대로 복사. 사진 5번은 그 Space의 대표 사진과 같은 장면이라 그 사진을 쓴다(새로 올리지 않음).
  const m = MUSIC_COMPLEX_PLAN;
  const src = await prisma.space.findFirst({ where: { name: m.srcName }, select: { name: true, tagline: true, description: true, location: true, openingHours: true, naverMapUrl: true, imageUrl: true } });
  if (await prisma.editorialSpace.findUnique({ where: { slug: m.slug }, select: { id: true } })) { console.log(`건너뜀  ${m.slug} (이미 있음)`); skipped++; }
  else if (!src?.imageUrl?.startsWith("https://")) { console.log(`건너뜀  ${m.slug} — 운영 Space "${m.srcName}"를 찾지 못함`); skipped++; }
  else {
    console.log(`등록    ${m.slug}  "${src.name.trim()}" · ${m.area} · ${m.category} · [${m.tags.join(", ")}]  <- 운영 Space 정보 · 사진 5번과 같은 대표 사진`);
    if (APPLY) {
      await prisma.editorialSpace.create({
        data: { slug: m.slug, name: src.name.trim(), area: m.area, category: m.category, summary: src.tagline?.trim() || null, description: usableDescription(src.description), coverImage: src.imageUrl, images: [], tags: m.tags, address: src.location?.trim() || null, openingHours: src.openingHours?.trim() || null, mapUrl: src.naverMapUrl?.trim() || null, cubeAvailable: false, story: [], isDemo: true, status: "PUBLISHED", publishedAt: new Date(base + 30 * 60_000) },
      });
    }
    created++;
  }
  console.log(`\n요약: 등록 ${created} · 건너뜀 ${skipped}${APPLY ? "" : "  (미리보기 — 적용하려면 --apply)"}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
