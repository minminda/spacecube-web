/**
 * 기존 발표·시연용 데이터에 시연 플래그(Space.isDemo / User.isDemo)를 표시한다 — 삭제 없음.
 * 정책: src/lib/demoData.ts. 되돌리기: 관리자 /admin/demo-data 또는 이 스크립트의 대상에서 빼고 수동 해제.
 *
 * 대상(2026-10-03 운영 DB 인벤토리 기준, 명시적 목록 — 패턴 추측으로 실제 공간을 건드리지 않기 위함):
 *  - 공간 buk("카페 공간"): 영구 시연 공간. 공개(isActive) 상태와 큐브 연결은 그대로 두고 목록·추천·KPI 합계에서만 뺀다.
 *  - 2026-04~06 온보딩·발표 테스트 공간 13곳: 이미 비공개(isActive=false). 실수로 다시 공개해도 목록에
 *    섞이지 않도록 시연 표시만 추가한다. 안전장치: 큐브가 연결돼 있거나 PIN이 설정된 공간은 건너뛴다.
 *  - 더미 계정: 이메일 "dummy.*@spacecube.local"(seed-cafe-guestbook-dummy.ts가 만든 계정).
 *
 * 실행: npx tsx prisma/mark-demo-data.ts          (dry-run, 변경 없음)
 *       npx tsx prisma/mark-demo-data.ts --apply  (실제 반영, 이미 표시된 행은 그대로 — 재실행 안전)
 */
import { prisma } from "../src/lib/prisma";

const PERMANENT_DEMO_SLUGS = ["buk"];
const DORMANT_TEST_SLUGS = [
  "-", "writingroom", "siiiidoplace", "dasijum", "OUTHOUSE", "denmark-library", "tail-tango",
  "silo-store", "terrific_jam", "cafe-gori", "cutthekake_", "brown-front-door", "goose-coffee-and-bar",
];
const DUMMY_USER_WHERE = { email: { startsWith: "dummy.", endsWith: "@spacecube.local" } };

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "== APPLY ==" : "== DRY RUN (변경 없음, --apply로 반영) ==");

  const spaces = await prisma.space.findMany({
    where: { slug: { in: [...PERMANENT_DEMO_SLUGS, ...DORMANT_TEST_SLUGS] } },
    select: { id: true, slug: true, name: true, isActive: true, isDemo: true, operatorPinHash: true, cube: { select: { code: true } } },
  });

  const spaceIds: string[] = [];
  for (const slug of [...PERMANENT_DEMO_SLUGS, ...DORMANT_TEST_SLUGS]) {
    const s = spaces.find((x) => x.slug === slug);
    if (!s) { console.log(`  skip  ${slug} — 없음`); continue; }
    const dormant = DORMANT_TEST_SLUGS.includes(slug);
    if (dormant && (s.isActive || s.cube || s.operatorPinHash)) {
      console.log(`  skip  ${slug} (${s.name}) — 공개 중이거나 큐브/PIN이 있어 실제 공간일 수 있음`);
      continue;
    }
    console.log(`  ${s.isDemo ? "keep " : "mark "} ${slug} (${s.name}) active=${s.isActive} cube=${s.cube?.code ?? "-"}`);
    if (!s.isDemo) spaceIds.push(s.id);
  }

  const users = await prisma.user.findMany({ where: { ...DUMMY_USER_WHERE, isDemo: false }, select: { id: true } });
  const alreadyUsers = await prisma.user.count({ where: { ...DUMMY_USER_WHERE, isDemo: true } });
  console.log(`  users mark ${users.length}, already ${alreadyUsers}`);

  if (!apply) return;
  const [s, u] = await prisma.$transaction([
    prisma.space.updateMany({ where: { id: { in: spaceIds } }, data: { isDemo: true } }),
    prisma.user.updateMany({ where: { id: { in: users.map((x) => x.id) } }, data: { isDemo: true } }),
  ]);
  console.log(`updated spaces=${s.count} users=${u.count}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
