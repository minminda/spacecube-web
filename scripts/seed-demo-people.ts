/**
 * 추천 > 사람 테스트용 더미 사용자 — 공개 프로필 + 아카이브(다녀온 곳 · 가보고 싶은 곳)를 가진 더미 계정.
 *   npx tsx --env-file=.env scripts/seed-demo-people.ts                 미리보기(DB 변경 없음)
 *   npx tsx --env-file=.env scripts/seed-demo-people.ts --apply         생성 · 갱신(몇 번 실행해도 같은 결과)
 *   npx tsx --env-file=.env scripts/seed-demo-people.ts --cleanup       전부 삭제(계정 cascade로 아카이브 · 공개 설정 · 관계 · 세션까지)
 *   npx tsx --env-file=.env scripts/seed-demo-people.ts --session <file>  로컬 브라우저 테스트용 "보는 사람" 세션 토큰을 파일에 쓴다
 *
 * 원칙
 * - 기존 데모 구조를 쓴다: 모든 계정은 User.isDemo = true. 운영의 일반 방문자에게는 사람 추천 · 공개 프로필에서 보이지 않고
 *   (관리자 · 로컬 개발 미리보기에서만, lib/demoData.ts previewDemoUsers), KPI에서도 빠진다.
 * - 이메일 demo-people+<key>@spacecube.local, 공개 주소 @demo-<key> 로만 만들고, 이 패턴 + isDemo인 계정만 수정 · 삭제한다.
 *   실제 사용자 · 아카이브는 읽지도 고치지도 않는다.
 * - 공간은 이미 있는 발행 canonical 공간(EditorialSpace)만 쓴다(새 공간 생성 없음). 없는 slug는 건너뛴다.
 * - 계정마다 아카이브를 지우고 다시 만든다(reset-then-seed) — 중복 실행해도 같은 상태.
 * - 닉네임은 unique라 실제 사용자가 이미 쓰는 이름이면 그 계정은 건너뛴다(덮어쓰지 않음).
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { placeKey } from "../src/lib/archive/source";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const CLEANUP = args.includes("--cleanup");
const SESSION_FILE = args.includes("--session") ? args[args.indexOf("--session") + 1] : null;

const emailOf = (key: string) => `demo-people+${key}@spacecube.local`;
const DEMO_EMAIL = { startsWith: "demo-people+", endsWith: "@spacecube.local" } as const;

type Pick = [slug: string, visited: boolean];
interface DemoPerson {
  key: string;
  nickname: string | null;
  bio: string | null;
  /** false: 비공개 프로필(추천에서 빠져야 하는 계정 · 테스트 "보는 사람") */
  public: boolean;
  spaces: Pick[];
}

/*
  공간 6곳: booknook-yeonnam(독립서점) · dasijeom(복합문화공간) · inner-discovery(복합문화공간)
            turndown-service(LP카페) · aka-coffee-room(카페) · nokhwabutton(촬영장비)
  보는 사람(viewer): 북눅 · 다시점 · 내면의 발견을 다녀옴 →
    민지 · 유진 · 지우 · 도윤이 위, 하은 · 다은 · 서윤이 아래로 와야 한다. 하린(비공개)은 나오면 안 된다.
*/
const PEOPLE: DemoPerson[] = [
  { key: "minji", nickname: "민지", bio: "책과 음악이 있는 공간을 좋아합니다.", public: true,
    spaces: [["booknook-yeonnam", true], ["dasijeom", true], ["turndown-service", true], ["inner-discovery", false]] },
  { key: "suhyun", nickname: "수현", bio: "음악이 먼저 들리는 곳을 찾아다녀요.", public: true,
    spaces: [["turndown-service", true], ["aka-coffee-room", true], ["nokhwabutton", false]] },
  { key: "jiwoo", nickname: "지우", bio: "작은 전시와 독립 공간을 찾아다닙니다.", public: true,
    spaces: [["inner-discovery", true], ["booknook-yeonnam", true], ["dasijeom", false]] },
  { key: "soyeon", nickname: "소연", bio: "작은 브랜드가 만든 독특한 공간을 모읍니다.", public: true,
    spaces: [["dasijeom", true], ["nokhwabutton", true], ["aka-coffee-room", false]] },
  { key: "haeun", nickname: "하은", bio: "커피 한 잔으로 오래 머물 수 있는 곳.", public: true,
    spaces: [["aka-coffee-room", true], ["nokhwabutton", true], ["turndown-service", false]] },
  { key: "yujin", nickname: "유진", bio: "혼자 오래 머물 수 있는 곳을 모읍니다.", public: true,
    spaces: [["booknook-yeonnam", true], ["inner-discovery", true], ["turndown-service", false], ["dasijeom", false]] },
  { key: "seoyun", nickname: "서윤", bio: null, public: true,
    spaces: [["nokhwabutton", true], ["aka-coffee-room", false]] },
  { key: "hyunwoo", nickname: "현우", bio: "LP와 책, 조용한 저녁.", public: true,
    spaces: [["turndown-service", true], ["inner-discovery", false], ["booknook-yeonnam", false]] },
  { key: "doyun", nickname: "도윤", bio: "공간이 곧 이야기인 곳을 좋아해요.", public: true,
    spaces: [["dasijeom", true], ["inner-discovery", true], ["aka-coffee-room", true], ["booknook-yeonnam", false]] },
  { key: "daeun", nickname: "다은", bio: null, public: true,
    spaces: [["aka-coffee-room", true], ["turndown-service", true]] },
  // 비공개 프로필 — 보는 사람과 공간이 완전히 같지만 추천에 나오면 안 된다
  { key: "harin", nickname: "하린", bio: "비공개 프로필", public: false,
    spaces: [["booknook-yeonnam", true], ["dasijeom", true], ["inner-discovery", true]] },
  // 테스트용 "보는 사람"(로그인 상태 화면 확인용, 비공개 · 닉네임 없음)
  { key: "viewer", nickname: null, bio: null, public: false,
    spaces: [["booknook-yeonnam", true], ["dasijeom", true], ["inner-discovery", true]] },
];

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: DEMO_EMAIL, isDemo: true }, select: { id: true, email: true } });
  console.log(`삭제 대상 ${users.length}명`);
  const r = await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) }, isDemo: true } });
  console.log(`삭제 ${r.count}명 (아카이브 · 공개 설정 · 관계 · 세션은 cascade)`);
}

async function seed() {
  const slugs = [...new Set(PEOPLE.flatMap((p) => p.spaces.map(([s]) => s)))];
  const spaces = await prisma.editorialSpace.findMany({
    where: { slug: { in: slugs }, status: "PUBLISHED", isDemo: false },
    select: { id: true, slug: true, name: true, area: true },
  });
  const bySlug = new Map(spaces.map((s) => [s.slug, s]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) console.log(`없는 공간(건너뜀): ${missing.join(", ")}`);

  for (const p of PEOPLE) {
    const email = emailOf(p.key);
    const handle = `demo-${p.key}`;
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, isDemo: true } });
    if (existing && !existing.isDemo) { console.log(`! ${email}는 더미가 아님 — 건너뜀`); continue; }
    if (p.nickname) {
      const taken = await prisma.user.findUnique({ where: { nickname: p.nickname }, select: { email: true } });
      if (taken && taken.email !== email) { console.log(`! 닉네임 "${p.nickname}" 사용 중(실사용자) — ${p.key} 건너뜀`); continue; }
    }
    const picks = p.spaces.filter(([s]) => bySlug.has(s));
    console.log(`${p.public ? "공개" : "비공개"} ${p.nickname ?? "(닉네임 없음)"} @${handle} — 다녀옴 ${picks.filter(([, v]) => v).length} · 가보고 싶음 ${picks.filter(([, v]) => !v).length}`);
    if (!APPLY) continue;

    const data = {
      nickname: p.nickname, isDemo: true, profilePublic: p.public, profileHandle: handle, profileBio: p.bio,
    };
    const user = existing
      ? await prisma.user.update({ where: { email }, data, select: { id: true } })
      : await prisma.user.create({ data: { email, ...data }, select: { id: true } });

    // reset-then-seed: 이 더미 계정의 아카이브와 공개 설정만 지우고 다시 만든다
    await prisma.$transaction([
      prisma.archiveEntry.deleteMany({ where: { userId: user.id } }),
      prisma.profileSpace.deleteMany({ where: { userId: user.id } }),
    ]);
    for (const [i, [slug, visited]] of picks.entries()) {
      const s = bySlug.get(slug)!;
      const at = new Date(Date.UTC(2026, 8, 1 + i * 3));
      await prisma.archiveEntry.create({
        data: {
          userId: user.id, spaceId: s.id, placeName: s.name, placeArea: s.area, placeKey: placeKey(s.name, s.area),
          status: visited ? "VISITED" : "SAVED", createdAt: at,
          ...(visited ? { visits: { create: [{ visitedOn: null }] } } : {}),
        },
      });
      if (p.public) await prisma.profileSpace.create({ data: { userId: user.id, spaceId: s.id } });
    }
  }
}

async function writeSession(file: string) {
  const viewer = await prisma.user.findUnique({ where: { email: emailOf("viewer") }, select: { id: true, isDemo: true } });
  if (!viewer?.isDemo) throw new Error("보는 사람 더미 계정이 없어요 — 먼저 --apply");
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.session.create({ data: { sessionToken, userId: viewer.id, expires: new Date(Date.now() + 2 * 60 * 60 * 1000) } });
  writeFileSync(file, sessionToken);
  console.log(`세션(2시간)을 ${file}에 썼어요. --cleanup으로 계정과 함께 지워집니다.`);
}

(async () => {
  try {
    if (CLEANUP) await cleanup();
    else if (SESSION_FILE) await writeSession(SESSION_FILE);
    else {
      await seed();
      if (!APPLY) console.log("\n미리보기입니다. 적용하려면 --apply");
    }
  } finally {
    await prisma.$disconnect();
  }
})();
