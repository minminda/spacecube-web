/* ── 대표 이미지가 "유효한가" ───────────────────────────────────────────────
   문자열이 비어 있지 않다는 것만이 아니라, 브라우저가 불러올 수 있는 형태인지 본다: 사이트 안 경로("/demo/x.jpg") 또는 http(s) 주소.
   공백 · 빈 문자열 · "null"/"undefined" 같은 값 · 프로토콜 없는 상대 문자열 · 다른 프로토콜(data: · javascript: 등)은 유효하지 않다.
   파일이 실제로 있는지(404)는 서버에서 매번 확인하지 않는다 — 형태만 본다. Discovery 후보(HOME · 검색 · 추천 · LATEST)에서 사진 없는 공간을 거를 때 쓴다. ── */

export function hasValidImageSrc(src: string | null | undefined): src is string {
  if (typeof src !== "string") return false;
  const t = src.trim();
  if (!t || t === "null" || t === "undefined") return false;
  if (t.startsWith("//")) return false;
  if (t.startsWith("/")) return t.length > 1;
  try {
    const u = new URL(t);
    return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname;
  } catch {
    return false;
  }
}
