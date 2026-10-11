/* ── 화면 테마(라이트 · 다크) ─────────────────────────────────────────────────
   선택은 이 기기(localStorage)에 저장한다 — 로그인 여부와 상관없이 같은 방식. 계정에 저장하려면 User 필드가 필요한데
   테마는 기기마다 달라도 되는 환경 설정이라 이번에는 스키마를 늘리지 않았다.
   html에 data-ed-theme="dark"를 붙이면 에디토리얼 화면(.editorial-bleed)과 상단 · 하단 바(.ed-chrome)의 색 토큰이 바뀐다
   (src/app/globals.css). Cube(QR 현장 경험) 화면은 기존 라이트 팔레트 그대로 — 현장에서 보는 화면이 설정에 따라 달라지지 않게.
   첫 페인트 전에 THEME_INIT_SCRIPT가 속성을 먼저 붙여 깜빡임(라이트 → 다크)을 막는다. 기본값은 라이트(시스템 설정은 따르지 않는다). ── */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "sc-theme";
export const THEME_ATTRIBUTE = "data-ed-theme";
/** 같은 탭에서 테마가 바뀌었음을 알리는 이벤트(storage 이벤트는 다른 탭에만 온다) */
export const THEME_CHANGE_EVENT = "sc-theme-change";

export function parseTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}

/** <head>에서 가장 먼저 실행 — 저장된 테마를 html에 붙인다. 저장소를 못 쓰는 환경이면 조용히 라이트. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"){document.documentElement.setAttribute("${THEME_ATTRIBUTE}","dark")}}catch(e){}`;
