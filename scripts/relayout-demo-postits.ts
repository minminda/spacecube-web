/* 졸업전시용 샘플 포스트잇 재배치 — 좌표(x, y)만 바꾼다. 글 · 작성자 · 개수 · 방문 기록은 건드리지 않는다.
 *
 *   npx tsx --env-file=.env scripts/relayout-demo-postits.ts --snapshot <전 snapshot.json> --out <폴더>            미리보기(dry-run, DB 변경 없음)
 *   npx tsx --env-file=.env scripts/relayout-demo-postits.ts --snapshot <전 snapshot.json> --out <폴더> --apply    좌표 반영
 *
 * 대상 = 샘플 작성자(isDemo)의 글 중 snapshot(전시용 추가 전 상태)에 없는 것. 실제 글 · 기존 샘플은 장애물로만 읽는다. */

import { PrismaClient } from "@prisma/client";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { SAMPLE_GUESTBOOK_AUTHOR_EMAIL } from "../src/lib/sampleGuestbookAuthor";
import { getVisibleClusters } from "../src/lib/guestbookSession";
import { IMAGE_NOTE_HEIGHT, SAMPLE_GAP, noteFootprint, sampleArea, scatterDemoNotes } from "../src/lib/sampleGuestbookLayout";
import { POST_IT_HEIGHT, clusterLabelRect, hasCollision, rectsOverlap, type Rect } from "../src/lib/postitCollision";
import { WORLD_H, WORLD_W } from "../src/lib/guestbookNoteBounds";

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const arg = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const SNAPSHOT = arg("--snapshot");
const OUT = arg("--out");
const SLUGS = ["aka-coffee-room", "nokhwabutton", "turndown-service"];
const EXPECT_PER_SPACE = 40;

type Row = { id: string; userId: string | null; content: string; nickname: string | null; x: number; y: number; rotation: number; imageUrl: string | null; clusterType: string };

function svg(title: string, notes: { x: number; y: number; rotation: number; kind: "real" | "old" | "demo"; hasImage?: boolean }[], labels: Rect[]): string {
  const S = 0.2; // 1000x1000 미리보기
  const color = { real: "#e0524d", old: "#8a8a8a", demo: "#f2c94c" };
  const a = sampleArea();
  const rects = notes.map((n) => {
    const h = n.hasImage ? IMAGE_NOTE_HEIGHT : POST_IT_HEIGHT;
    return `<rect x="${n.x * S}" y="${n.y * S}" width="${170 * S}" height="${h * S}" fill="${color[n.kind]}" stroke="#000" stroke-width="0.6" transform="rotate(${n.rotation} ${(n.x + 85) * S} ${(n.y + h / 2) * S})"/>`;
  });
  const lab = labels.map((r) => `<rect x="${r.x * S}" y="${r.y * S}" width="${r.width * S}" height="${r.height * S}" fill="#4a90e2" fill-opacity=".35" stroke="#4a90e2"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORLD_W * S} ${WORLD_H * S + 30}" width="700"><rect width="100%" height="100%" fill="#111"/><text x="8" y="18" fill="#fff" font-size="14" font-family="sans-serif">${title}</text><g transform="translate(0 30)"><rect x="${a.minX * S}" y="${a.minY * S}" width="${(a.maxX - a.minX + 170) * S}" height="${(a.maxY - a.minY + 190) * S}" fill="none" stroke="#555" stroke-dasharray="4"/>${lab.join("")}${rects.join("")}</g></svg>`;
}

(async () => {
  try {
    if (!SNAPSHOT) throw new Error("--snapshot <파일> 필요(전시용 추가 전 상태)");
    const snap = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as { notes: { id: string; x: number; y: number; content: string; deletedAt: string | null }[] };
    const snapById = new Map(snap.notes.map((n) => [n.id, n]));
    const author = await prisma.user.findUnique({ where: { email: SAMPLE_GUESTBOOK_AUTHOR_EMAIL }, select: { id: true, isDemo: true } });
    if (!author?.isDemo) throw new Error("샘플 작성자(isDemo)를 찾지 못했어요 — 중단");
    if (OUT) mkdirSync(OUT, { recursive: true });

    const totals = { targets: 0, newNotes: 0, textChanges: 0, realChanged: 0, oldSampleChanged: 0, labelConflicts: 0, pairConflicts: 0, fixedConflicts: 0, failed: 0 };
    const backup: Record<string, { id: string; x: number; y: number }[]> = {};
    const updates: { id: string; x: number; y: number }[] = [];

    for (const slug of SLUGS) {
      const space = await prisma.space.findUnique({ where: { slug }, select: { id: true, name: true } });
      if (!space) throw new Error(`공간 없음: ${slug}`);
      const session = await prisma.guestbookSession.findFirst({ where: { spaceId: space.id, status: "ACTIVE" } });
      if (!session) throw new Error(`진행 중인 방명록 없음: ${slug}`);
      const rows: Row[] = await prisma.guestbookNote.findMany({
        where: { guestbookSessionId: session.id, deletedAt: null },
        select: { id: true, userId: true, content: true, nickname: true, x: true, y: true, rotation: true, imageUrl: true, clusterType: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      // 사전 snapshot 대비: 기존 글은 좌표 · 내용이 그대로여야 한다
      for (const s of snap.notes.filter((n) => rows.length >= 0 && !n.deletedAt)) {
        const cur = rows.find((r) => r.id === s.id);
        if (!cur) continue; // 다른 공간의 글
        if (cur.content !== s.content) totals.textChanges++;
        if (cur.x !== s.x || cur.y !== s.y) totals.realChanged++;
      }

      const targets = rows.filter((r) => r.userId === author.id && !snapById.has(r.id));
      const fixed = rows.filter((r) => !targets.includes(r));
      const centers = getVisibleClusters(session).map((c) => ({ x: c.x, y: c.y }));
      totals.targets += targets.length;
      backup[slug] = targets.map((t) => ({ id: t.id, x: t.x, y: t.y }));

      const { placements, failed } = scatterDemoNotes({
        targets: targets.map((t) => ({ id: t.id, rotation: t.rotation })),
        fixed: fixed.map((n) => ({ x: n.x, y: n.y, rotation: n.rotation, hasImage: !!n.imageUrl })),
        visibleLabels: centers,
        seed: `${space.id}:demo-relayout`,
      });
      totals.failed += failed.length;

      // 검증 — 실제 렌더 크기(회전 포함) 기준
      const area = sampleArea();
      const fp = (id: string) => { const t = targets.find((x) => x.id === id)!; const p = placements.get(id)!; return noteFootprint(p.x, p.y, t.rotation); };
      const labelRects = centers.map((c) => clusterLabelRect(c));
      const fixedRects = fixed.map((n) => noteFootprint(n.x, n.y, n.rotation, n.imageUrl ? IMAGE_NOTE_HEIGHT : POST_IT_HEIGHT));
      const ids = [...placements.keys()];
      for (const id of ids) {
        if (hasCollision(fp(id), labelRects, SAMPLE_GAP)) totals.labelConflicts++;
        if (hasCollision(fp(id), fixedRects, SAMPLE_GAP)) totals.fixedConflicts++;
        const p = placements.get(id)!;
        if (p.x < area.minX || p.x > area.maxX || p.y < area.minY || p.y > area.maxY) totals.fixedConflicts++;
      }
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (rectsOverlap(fp(ids[i]), fp(ids[j]), SAMPLE_GAP)) totals.pairConflicts++;

      // 분포(사분면) · 최소 간격 요약
      const quad = [0, 0, 0, 0];
      for (const p of placements.values()) quad[(p.x + 85 > WORLD_W / 2 ? 1 : 0) + (p.y + 95 > WORLD_H / 2 ? 2 : 0)]++;
      const xs = [...placements.values()].map((p) => p.x), ys = [...placements.values()].map((p) => p.y);
      console.log(`- ${space.name} (${slug}): 전체 ${rows.length} · 대상 ${targets.length} · 고정 ${fixed.length} · 배치 ${placements.size} · 실패 ${failed.length}`);
      console.log(`  사분면(좌상/우상/좌하/우하) ${quad.join("/")} · x ${Math.min(...xs)}~${Math.max(...xs)} · y ${Math.min(...ys)}~${Math.max(...ys)}`);

      if (OUT) {
        const kindOf = (r: Row) => (r.userId === author.id ? "old" : "real") as "old" | "real";
        writeFileSync(`${OUT}/${slug}-before.svg`, svg(`${slug} BEFORE`, [...fixed.map((r) => ({ ...r, kind: kindOf(r), hasImage: !!r.imageUrl })), ...targets.map((r) => ({ ...r, kind: "demo" as const }))], labelRects));
        writeFileSync(`${OUT}/${slug}-after.svg`, svg(`${slug} AFTER`, [...fixed.map((r) => ({ ...r, kind: kindOf(r), hasImage: !!r.imageUrl })), ...targets.map((r) => ({ ...r, ...placements.get(r.id)!, kind: "demo" as const }))], labelRects));
      }
      for (const [id, p] of placements) updates.push({ id, x: p.x, y: p.y });
    }

    if (OUT) writeFileSync(`${OUT}/demo-coords-before.json`, JSON.stringify({ takenAt: new Date().toISOString(), notes: backup }, null, 1));
    console.log(`\n[검증] 대상 ${totals.targets}개(기대 ${EXPECT_PER_SPACE * SLUGS.length}) · 신규 ${totals.newNotes} · 텍스트 변경 ${totals.textChanges} · 기존 글 좌표 변경 ${totals.realChanged}`);
    console.log(`[충돌] 라벨 ${totals.labelConflicts} · 기존 글/샘플·범위 ${totals.fixedConflicts} · 포스트잇 간 ${totals.pairConflicts} · 배치 실패 ${totals.failed}`);
    const ok = totals.targets === EXPECT_PER_SPACE * SLUGS.length && totals.textChanges === 0 && totals.realChanged === 0 && totals.labelConflicts === 0 && totals.fixedConflicts === 0 && totals.pairConflicts === 0 && totals.failed === 0;
    if (!ok) throw new Error("검증 실패 — 반영하지 않습니다");
    if (!APPLY) { console.log("(dry-run — 반영하려면 --apply)"); return; }
    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const r = await tx.guestbookNote.updateMany({ where: { id: u.id, userId: author.id }, data: { x: u.x, y: u.y } }); // 작성자 조건 — 좌표만
        if (r.count !== 1) throw new Error(`갱신 실패: ${u.id}`);
      }
    }, { maxWait: 15_000, timeout: 60_000 });
    console.log(`좌표 ${updates.length}개 갱신 완료`);
  } catch (e) {
    console.error(`[relayout] ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
