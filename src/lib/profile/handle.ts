/* ── 프로필 주소(handle) 자동 발급(서버 전용) ─────────────────────────────────
   프로필은 기본 공개이고, 내 아카이브 공유는 공개 여부와 상관없이 항상 /@handle을 쓴다 — 그래서 모든 사용자에게
   주소가 있어야 한다. 가입할 때(auth events.createUser) 발급하고, 혹시 없는 사람은 아카이브를 열 때 발급한다.
   형식은 "u" + 영문 소문자 · 숫자 7자(예: u7k3m9qx) — 설정에서 언제든 원하는 주소로 바꿀 수 있다.
   내부 사용자 id에서 만들지 않는다(무작위). ── */

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { HANDLE_RE } from "./publicProfile";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomHandle(): string {
  const bytes = randomBytes(7);
  let s = "u";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

/** 이미 주소가 있으면 그대로, 없으면 겹치지 않는 주소를 발급해 저장하고 돌려준다. */
export async function ensureProfileHandle(userId: string): Promise<string | null> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { profileHandle: true } });
  if (!me) return null;
  if (me.profileHandle) return me.profileHandle;
  for (let i = 0; i < 5; i++) {
    const handle = randomHandle();
    if (!HANDLE_RE.test(handle)) continue;
    // profileHandle이 비어 있을 때만 채운다(동시에 두 번 불려도 한 번만 발급)
    const r = await prisma.user.updateMany({ where: { id: userId, profileHandle: null }, data: { profileHandle: handle } }).catch(() => ({ count: -1 }));
    if (r.count === 1) return handle;
    if (r.count === 0) {
      const again = await prisma.user.findUnique({ where: { id: userId }, select: { profileHandle: true } });
      if (again?.profileHandle) return again.profileHandle;
    }
    // count -1: 주소가 겹침(unique) — 다른 주소로 다시
  }
  return null;
}
