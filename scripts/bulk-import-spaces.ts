/**
 * 일반 문화공간(EditorialSpace) 일괄 등록 — 홈페이지 콘텐츠 다양성용 최소 정보만.
 *   npx tsx --env-file=.env scripts/bulk-import-spaces.ts <입력.json>                 미리보기(DB 변경 없음, 기본)
 *   npx tsx --env-file=.env scripts/bulk-import-spaces.ts <입력.json> --apply         DRAFT(비공개 초안)로 등록
 *   npx tsx --env-file=.env scripts/bulk-import-spaces.ts <입력.json> --apply --publish   PUBLISHED(공개)로 등록
 * 옵션: --allow-new  정본에 없는 유형 · 태그를 오류가 아니라 경고로(새 태그는 관리자에서 먼저 만드는 것을 권장)
 *
 * 하는 일: 공개 계층 EditorialSpace 새 행 생성뿐. 기존 행은 수정 · 삭제하지 않는다(같은 slug+이름이면 건너뜀 → 재실행 안전).
 * 안 하는 일: Episode · Scene · Cube · 운영자 · 방명록 · 운영 Space · Partner 관계. cubeAvailable은 항상 false.
 * 가상 정보가 들어간 공간은 "fictional": true → isDemo=true(HOME · 검색 · 추천 · 상세 어디에도 공개되지 않음).
 * 이미지는 https URL 그대로, 또는 로컬 파일 경로(--apply 때 Cloudinary unsigned preset으로 업로드 — 관리자 업로드와 같은 경로).
 *   로컬 경로는 입력 JSON이 있는 폴더 기준 상대 경로. 파일당 10MB 이하(Cloudinary 무료 한도) — 크면 줄여서 올릴 것.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { extractEntries, planImport, summarize, withUploadedImages, type PlanItem } from "../src/lib/editorial/bulkSpaceImport";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const APPLY = args.includes("--apply");
const PUBLISH = args.includes("--publish");
const ALLOW_NEW = args.includes("--allow-new");
const TYPE_CATEGORY_NAME = "공간 유형";
const MAX_BYTES = 10 * 1024 * 1024;

async function loadCtx() {
  const [existing, districts, typeTags, tags] = await Promise.all([
    prisma.editorialSpace.findMany({ select: { slug: true, name: true, area: true, category: true, tags: true } }),
    prisma.district.findMany({ select: { name: true } }),
    prisma.tag.findMany({ where: { isActive: true, categoryRef: { name: TYPE_CATEGORY_NAME } }, select: { name: true } }),
    prisma.tag.findMany({ where: { isActive: true }, select: { name: true } }),
  ]);
  const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
  return {
    existing: existing.map((e) => ({ slug: e.slug, name: e.name })),
    areas: uniq([...districts.map((d) => d.name), ...existing.map((e) => e.area)]),
    types: uniq([...typeTags.map((t) => t.name), ...existing.map((e) => e.category)]),
    tags: uniq([...tags.map((t) => t.name), ...existing.flatMap((e) => e.tags)]),
    allowNew: ALLOW_NEW,
  };
}

async function uploadLocal(abs: string): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET 환경변수가 없어요.");
  const body = new FormData();
  body.append("file", new Blob([fs.readFileSync(abs)]), path.basename(abs));
  body.append("upload_preset", preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) throw new Error(json.error?.message ?? `업로드 실패(${res.status})`);
  return json.secure_url;
}

function print(items: PlanItem[]) {
  for (const i of items) {
    const tag = i.status === "create" ? (i.fictional ? "등록(가상·비공개)" : "등록") : i.status === "skip" ? "건너뜀" : "오류";
    console.log(`#${i.index} [${tag}] ${i.name || "(이름 없음)"} (${i.slug || "-"})`);
    for (const e of i.errors) console.log(`    ✗ ${e}`);
    for (const w of i.warnings) console.log(`    △ ${w}`);
  }
}

async function main() {
  if (!file) {
    console.error("사용법: npx tsx --env-file=.env scripts/bulk-import-spaces.ts <입력.json> [--apply] [--publish] [--allow-new]");
    process.exitCode = 1;
    return;
  }
  if (PUBLISH && !APPLY) console.log("(--publish는 --apply와 함께일 때만 의미가 있어요. 지금은 미리보기입니다.)");
  const abs = path.resolve(file);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(abs, "utf-8"));
  } catch (e) {
    console.error(`입력 파일을 읽을 수 없어요: ${(e as Error).message}`);
    process.exitCode = 1;
    return;
  }
  const ext = extractEntries(raw);
  if (!ext.ok) {
    console.error(ext.error);
    process.exitCode = 1;
    return;
  }

  const host = (() => { try { return new URL(process.env.DATABASE_URL ?? "").host; } catch { return "(알 수 없음)"; } })();
  console.log(`대상 DB: ${host}  ·  모드: ${APPLY ? (PUBLISH ? "적용(공개)" : "적용(초안)") : "미리보기"}\n`);

  const items = planImport(ext.entries, await loadCtx());

  // 로컬 이미지 파일 확인(미리보기에서도)
  const baseDir = path.dirname(abs);
  for (const i of items) {
    for (const p of i.localImages) {
      const f = path.resolve(baseDir, p);
      if (!fs.existsSync(f)) i.errors.push(`이미지 파일이 없어요: ${p}`);
      else if (fs.statSync(f).size > MAX_BYTES) i.errors.push(`이미지가 10MB를 넘어요: ${p}`);
      if (i.errors.length > 0) i.status = "error";
    }
  }
  print(items);

  const s = summarize(items);
  console.log(`\n요약: 총 ${s.total}곳 · 등록 ${s.create}(그중 가상·비공개 ${s.fictional}) · 건너뜀 ${s.skip} · 오류 ${s.error}`);
  if (s.error > 0) {
    console.log("오류가 있어 아무것도 쓰지 않았어요. 입력 파일을 고친 뒤 다시 실행하세요.");
    process.exitCode = 1;
    return;
  }
  if (!APPLY) {
    console.log("미리보기라 DB를 바꾸지 않았어요. 적용하려면 --apply (공개까지 하려면 --apply --publish).");
    return;
  }

  let created = 0;
  for (const i of items) {
    if (i.status !== "create" || !i.data) continue;
    const uploaded = new Map<string, string>();
    for (const p of i.localImages) uploaded.set(p, await uploadLocal(path.resolve(baseDir, p)));
    const d = withUploadedImages(i.data, uploaded);
    const publish = PUBLISH && !i.fictional;
    try {
      await prisma.editorialSpace.create({
        data: {
          slug: d.slug, name: d.name, area: d.area, category: d.category, summary: d.summary, description: d.description,
          coverImage: d.coverImage, coverPosition: d.coverPosition, images: d.images, tags: d.tags,
          address: d.address, openingHours: d.openingHours, mapUrl: d.mapUrl, instagram: d.instagram, website: d.website,
          cubeAvailable: false, story: [], isDemo: i.fictional,
          status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null,
        },
      });
      created++;
      console.log(`등록: ${d.name} (${d.slug}) — ${publish ? "공개" : i.fictional ? "가상·비공개" : "초안"}`);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") console.log(`건너뜀(그 사이 같은 slug 생김): ${d.slug}`);
      else throw e;
    }
  }
  console.log(`\n완료: ${created}곳 등록.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
