/* ── 데스크톱 상세 창 — 새로고침해도 HOME 위 창으로 ─────────────────────────────
   상세 창은 @modal/(.)spaces 가로채기 라우트라 앱 안 이동에서만 뜬다. 새로고침(서버 요청)에는 가로채기가 없어
   /spaces/[slug] 독립 페이지가 그려진다. 그래서 "창이 열린 채로 이 문서를 떠난다"는 사실을 다음 요청에만 알려 준다.

   - 창이 열린 문서를 떠날 때(beforeunload — 새로고침 · 뒤로/앞으로 · 탭 닫기. 다음 문서 요청보다 먼저 실행된다.
     pagehide는 새 요청이 나간 뒤라 쿠키가 실리지 않음) 짧은 쿠키 sc_modal=<slug>(10초)를 남긴다.
     X · 바깥 클릭 · ESC로 닫는 중이면 값은 "*"(뒤로 가서 도착하는 곳이 다른 공간의 창일 수 있다 — 그 공간도 창으로).
   - /spaces/[slug] 서버 페이지는 쿠키가 이 slug(또는 "*")이고 데스크톱이면 HOME + 상세 창을 그린다(깜빡임 없음).
   - 모든 문서는 <head>에서 이 쿠키를 바로 지운다(MODAL_COOKIE_CLEAR_SCRIPT) → 쿠키는 "떠난 직후의 다음 문서 요청 한 번"에만 쓰인다.
   그래서 처음부터 주소창 · 외부 링크로 들어온 사람은 창을 연 적이 없으니 항상 독립 페이지다. 공유 주소는 그대로 /spaces/[slug]. ── */

export const MODAL_RESTORE_COOKIE = "sc_modal";
export const MODAL_RESTORE_MAX_AGE_S = 10;
/** 닫는 중(뒤로 가는 중)에 남기는 값 — 도착하는 공간이 무엇이든 창으로 */
export const MODAL_RESTORE_ANY = "*";

/** 서버: 이 요청에서 상세를 창으로 다시 그릴지 */
export function shouldRestoreModal(cookieValue: string | undefined | null, slug: string): boolean {
  if (!cookieValue) return false;
  if (cookieValue === MODAL_RESTORE_ANY) return true;
  try {
    return decodeURIComponent(cookieValue) === slug;
  } catch {
    return false;
  }
}

/** /spaces/<slug> 주소에서 slug(그 외 주소면 null) */
export function spaceSlugFromPath(pathname: string): string | null {
  const m = /^\/spaces\/([^/?#]+)\/?$/.exec(pathname);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/** 클라이언트: 창이 열린 채 문서를 떠날 때 */
export function rememberModalOnLeave(closing: boolean): void {
  const slug = spaceSlugFromPath(window.location.pathname);
  const value = closing ? MODAL_RESTORE_ANY : slug ? encodeURIComponent(slug) : null;
  if (!value) return;
  document.cookie = `${MODAL_RESTORE_COOKIE}=${value}; Max-Age=${MODAL_RESTORE_MAX_AGE_S}; Path=/; SameSite=Lax`;
}

/** 모든 문서의 <head>에서 — 이전 문서가 남긴 쿠키는 이 요청에서 이미 읽혔으므로 바로 지운다(일회성) */
export const MODAL_COOKIE_CLEAR_SCRIPT = `try{if(document.cookie.indexOf("${MODAL_RESTORE_COOKIE}=")>-1){document.cookie="${MODAL_RESTORE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax"}}catch(e){}`;
