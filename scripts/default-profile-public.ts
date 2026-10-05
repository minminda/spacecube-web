/**
 * 프로필 기본 공개 정책(2026-10-05)을 기존 사용자에게 적용 — "기본값 때문에 비공개였던 사람"만 공개로.
 *   npx tsx --env-file=.env scripts/default-profile-public.ts            미리보기(DB 변경 없음)
 *   npx tsx --env-file=.env scripts/default-profile-public.ts --apply    적용(몇 번 실행해도 같은 결과)
 *
 * 구분 기준: 공개로 바꾸려면 프로필 주소(handle)가 먼저 있어야 했다(parseProfileSettings). 그래서
 *   profilePublic=false 이고 profileHandle이 없는 사람 = 공개 설정을 한 번도 건드리지 않은 사람(기본값) → 공개 + 주소 발급
 *   profilePublic=false 이고 profileHandle이 있는 사람 = 직접 비공개를 골랐을 수 있음 → 그대로 둔다
 * 더미 계정(isDemo)은 기존 데모 정책을 따르므로 제외. 공간은 공개되지 않는다(ProfileSpace는 사용자가 하나씩 켠다).
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])$/;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const randomHandle = () => "u" + [...randomBytes(7)].map((b) => ALPHABET[b % ALPHABET.length]).join("");

(async () => {
  try {
    const defaults = await prisma.user.findMany({ where: { isDemo: false, profilePublic: false, profileHandle: null }, select: { id: true } });
    const explicit = await prisma.user.count({ where: { isDemo: false, profilePublic: false, profileHandle: { not: null } } });
    console.log(`기본값 비공개(공개로 바꿀 대상): ${defaults.length}명 · 직접 비공개 가능성(유지): ${explicit}명`);
    if (!APPLY) {
      console.log("미리보기입니다. 적용하려면 --apply");
      return;
    }
    let done = 0;
    for (const u of defaults) {
      for (let i = 0; i < 5; i++) {
        const handle = randomHandle();
        if (!HANDLE_RE.test(handle)) continue;
        const r = await prisma.user
          .updateMany({ where: { id: u.id, profilePublic: false, profileHandle: null }, data: { profilePublic: true, profileHandle: handle } })
          .catch(() => ({ count: -1 }));
        if (r.count === 1) { done += 1; break; }
        if (r.count === 0) break; // 그 사이 본인이 바꿈
      }
    }
    console.log(`공개 + 주소 발급: ${done}명`);
  } finally {
    await prisma.$disconnect();
  }
})();
