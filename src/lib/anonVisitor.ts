/* ── 비로그인 방문자 식별(sc_anon_id) ──────────────────────────────────
   실제 파일럿 방문자는 대부분 로그인 없이 QR로 공간 이야기를 읽는다. 스토리 조회/완독
   KPI(EpisodeRead)가 로그인 사용자만 기록해오던 갭을 메우기 위해, 개인정보를 담지 않는
   무작위 토큰만 브라우저 쿠키로 심어 "같은 방문자의 반복 진입"을 구분한다 — 이름/이메일/
   IP 등 어떤 개인정보도 이 값에 담기지 않는다(fingerprinting 아님, 순수 난수 하나).

   유효기간은 src/lib/spaceUnlock.ts의 QR_ACCESS_COOKIE와 동일한 값
   (QR_ACCESS_COOKIE_MAX_AGE_SECONDS = REVISIT_INTERVAL_HOURS)을 그대로 재사용한다 —
   이 서비스의 기존 "12시간 재방문" 정책과 같은 창을 쓰므로, 그 창을 넘겨 다시 찾아오면
   새 anonId가 발급되어 "새 조회"로 집계되는 것도 기존 재방문 정의와 자연스럽게 맞는다. ── */

import { randomUUID } from "crypto";
import type { cookies } from "next/headers";
import { QR_ACCESS_COOKIE_MAX_AGE_SECONDS } from "@/lib/spaceUnlock";

export const ANON_VISITOR_COOKIE = "sc_anon_id";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/** Route Handler 전용 — 이미 발급된 anonId가 있으면 그대로 재사용하고, 없을 때만 새로
 * 발급해 심는다(있는데도 매번 만료시간을 갱신하지 않는다 — 최초 조회로부터 정확히
 * REVISIT_INTERVAL_HOURS가 지나야 "새 방문"으로 다시 집계되도록 하기 위함). */
export function getOrCreateAnonVisitorId(store: CookieStore): string {
  const existing = store.get(ANON_VISITOR_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(ANON_VISITOR_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: QR_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  return id;
}
