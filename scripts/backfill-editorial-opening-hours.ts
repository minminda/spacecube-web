/**
 * 공개 공간(EditorialSpace)의 비어 있는 운영시간을, 같은 slug의 운영 공간(Space — Cube 운영 관리자 폼에서 입력한 값)에서 한 번 옮겨 온다.
 *   npx tsx --env-file=.env scripts/backfill-editorial-opening-hours.ts            미리보기(DB 변경 없음)
 *   npx tsx --env-file=.env scripts/backfill-editorial-opening-hours.ts --apply    적용(몇 번 실행해도 결과가 같다)
 *
 * 왜: 공개 상세(/spaces/[slug])의 "운영시간"은 EditorialSpace.openingHours를 읽는데, 공개 계층은 운영 계층과 따로 입력돼 와서
 * 실제 공개 공간 6곳 모두 비어 있었다. 같은 공간의 운영시간은 운영 공간(Space.openingHours)에 이미 사람이 입력해 둔 값이 있다.
 *
 * 원칙
 * - 비어 있는(null · 공백) 공개 운영시간만 채운다. 이미 값이 있으면 절대 덮어쓰지 않는다.
 * - 값은 운영 공간에 이미 저장된 문자열 그대로(공백만 정리). 추측 · 외부 검색 값 없음. 운영 공간에도 없으면 비워 둔다(= 미확인).
 * - 시연(isDemo) 공간은 건드리지 않는다. 다른 필드는 바꾸지 않는다.
 * - 이후 수정은 관리자 > 콘텐츠 > 공간 편집의 "운영 시간" 칸에서 한다(공개 화면은 그 값만 읽는다).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

async function main() {
  const eds = await prisma.editorialSpace.findMany({
    where: { isDemo: false },
    select: { id: true, slug: true, name: true, status: true, openingHours: true },
    orderBy: { name: "asc" },
  });
  const ops = await prisma.space.findMany({
    where: { slug: { in: eds.map((e) => e.slug) } },
    select: { slug: true, openingHours: true },
  });
  const opHours = new Map(ops.map((o) => [o.slug, clean(o.openingHours)]));

  const plan: { id: string; name: string; value: string }[] = [];
  for (const e of eds) {
    const current = clean(e.openingHours);
    const source = opHours.get(e.slug) ?? "";
    const verdict = current ? `유지(이미 있음): ${current}` : source ? `채움 ← 운영 공간: ${source}` : "미확인(운영 공간에도 없음)";
    console.log(`${e.status.padEnd(9)} ${e.name} (${e.slug}) — ${verdict}`);
    if (!current && source) plan.push({ id: e.id, name: e.name, value: source });
  }

  if (!APPLY) {
    console.log(`\n미리보기: ${plan.length}곳을 채울 예정. 적용하려면 --apply`);
    return;
  }
  for (const p of plan) {
    // 조건부 갱신 — 실행 사이에 누가 값을 넣었으면 건너뛴다(덮어쓰기 없음)
    const r = await prisma.editorialSpace.updateMany({ where: { id: p.id, OR: [{ openingHours: null }, { openingHours: "" }] }, data: { openingHours: p.value } });
    console.log(`${r.count ? "채움" : "건너뜀(그 사이 값이 생김)"}: ${p.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
