/* ── 로그인 전에 누른 행동 → 로그인 후 한 번 자동 완료(공간 상세의 저장 · 다녀왔어요 두 가지만) ─────────────
   비로그인으로 누르면:
     ① 이 기기(localStorage)에 { 행동, 공간 id, 일회용 번호(nonce), 시각 }을 남기고
     ② 로그인 화면의 callbackUrl(기존 체계 그대로)에 같은 번호만 ?sc_intent=<nonce>로 붙인다.
   로그인 후 같은 상세로 돌아오면(SpaceRelation):
     ③ 주소에서 sc_intent를 바로 지우고(history.replaceState — 새로고침 · 뒤로가기로 다시 실행되지 않음)
     ④ 저장된 기록을 꺼내 즉시 지운 뒤(일회성) 번호 · 공간 · 행동 · 유효 시간(30분)이 모두 맞을 때만 실행한다.
   - 주소만 만들어 보내도 실행되지 않는다: 번호는 누른 사람의 기기에만 있다(남이 보낸 링크로 내 기록이 바뀌지 않음).
   - 실제 변경은 기존 API(저장 POST /api/saves/spaces/[id], 방문 POST /api/archive/entries)가 로그인한 본인 기준으로 검증한다.
   - 로그인을 취소하면 주소에 번호가 없으니 아무 일도 없고, 남은 기록은 다음 클릭에 덮이거나 30분 뒤 무시된다. ── */

export type PendingIntentKind = "save" | "visited";

export const INTENT_PARAM = "sc_intent";
const STORAGE_KEY = "sc-pending-intent";
export const INTENT_TTL_MS = 30 * 60 * 1000;

interface StoredIntent {
  n: string;
  k: PendingIntentKind;
  s: string;
  t: number;
}

/** 저장된 기록이 지금 돌아온 주소 · 공간과 맞으면 행동 종류, 아니면 null(순수 함수 — 테스트용) */
export function matchPendingIntent(stored: unknown, nonce: string | null, spaceId: string, now: number): PendingIntentKind | null {
  if (!nonce || !stored || typeof stored !== "object") return null;
  const r = stored as Partial<StoredIntent>;
  if (r.n !== nonce || r.s !== spaceId) return null;
  if (r.k !== "save" && r.k !== "visited") return null;
  if (typeof r.t !== "number" || now - r.t < 0 || now - r.t > INTENT_TTL_MS) return null;
  return r.k;
}

/** 돌아올 주소(경로 + 검색어)에 번호를 붙인다 — 이미 있던 sc_intent는 바꾼다(순수 함수) */
export function withIntentParam(pathWithSearch: string, nonce: string): string {
  const url = new URL(pathWithSearch, "http://x");
  url.searchParams.set(INTENT_PARAM, nonce);
  return `${url.pathname}${url.search}${url.hash}`;
}

function newNonce(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * 비로그인 클릭 → 로그인 화면 주소. 기기에 기록을 남기지 못하면(저장소 차단) 기존처럼 번호 없이 보낸다
 * (로그인 후 다시 누르면 되는 예전 동작 — 오류 없음).
 */
export function loginHrefWithIntent(kind: PendingIntentKind, spaceId: string): string {
  const here = `${window.location.pathname}${window.location.search}`;
  let back = here;
  try {
    const n = newNonce();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ n, k: kind, s: spaceId, t: Date.now() } satisfies StoredIntent));
    back = withIntentParam(here, n);
  } catch {
    /* 저장소를 못 쓰면 의도 보존만 포기 */
  }
  return `/login?callbackUrl=${encodeURIComponent(back)}`;
}

/**
 * 돌아온 화면에서 한 번만 호출 — 주소의 번호를 지우고 저장된 기록도 지운 뒤, 맞으면 행동 종류를 돌려준다.
 * 번호가 없는 일반 진입이면 아무것도 건드리지 않고 null.
 */
export function takePendingIntent(spaceId: string): PendingIntentKind | null {
  const url = new URL(window.location.href);
  const nonce = url.searchParams.get(INTENT_PARAM);
  if (!nonce) return null;
  url.searchParams.delete(INTENT_PARAM);
  // Next.js가 history.state에 라우터 상태를 두므로 state는 그대로 넘긴다
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  let stored: unknown = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  return matchPendingIntent(stored, nonce, spaceId, Date.now());
}
