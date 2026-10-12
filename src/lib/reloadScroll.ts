/* ── 새로고침하면 맨 위에서 ─────────────────────────────────────────────────
   브라우저는 새로고침(F5 · Ctrl+R · 새로고침 버튼) 때 보던 스크롤 위치를 복원한다(history.scrollRestoration = "auto",
   Next.js는 이 값을 건드리지 않는다). 휴대폰에서 HOME 카드 → 공간 상세는 같은 주소를 다시 불러오므로(SpaceDetailModal),
   HOME에서 내려가 있던 위치가 상세에 그대로 남는 문제도 여기서 생긴다.

   - 문서를 떠날 때(pagehide) 지금 기록 항목을 "manual"로 바꿔 둔다 → 같은 항목을 다시 불러오는 새로고침은 맨 위에서 열린다.
     새로 열린 문서의 <head>에서 바꾸면 늦다(Chrome 실측: 첫 복원 시도가 그 전에 일어난다).
   - 새 문서는 load가 끝난 뒤 "auto"로 되돌린다. 더 일찍 되돌리면 브라우저가 로딩 중 복원을 다시 시도한다(실측).
     pushState로 생기는 항목은 현재 값을 물려받으므로, 이후 앱 안 링크 이동 → 뒤로가기의 위치 복원은 지금처럼 브라우저가 한다.
   - bfcache로 돌아온 문서는 스크립트가 다시 돌지 않으므로 pageshow(persisted)에서 "auto"로 되돌린다.
   - 남는 차이: 같은 탭에서 다른 사이트로 나갔다가 뒤로 돌아온 경우도 맨 위에서 열린다(외부 링크는 대부분 새 탭). ── */
export const RELOAD_SCROLL_TOP_SCRIPT = `(function(){try{if(!("scrollRestoration" in history))return;var h=history;var auto=function(){setTimeout(function(){h.scrollRestoration="auto"},0)};if(document.readyState==="complete")auto();else addEventListener("load",auto,{once:true});addEventListener("pagehide",function(){h.scrollRestoration="manual"});addEventListener("pageshow",function(e){if(e.persisted)h.scrollRestoration="auto"})}catch(e){}})();`;
