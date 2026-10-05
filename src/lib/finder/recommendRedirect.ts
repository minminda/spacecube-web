import { normalizeArea } from "@/lib/editorial/area";

/**
 * 예전 추천 주소(/recommend?area= · ?pa=)가 갈 곳 — 기존 링크·북마크를 깨지 않는다.
 * 새 정보구조를 볼 수 있으면 지역을 유지한 채 /find, 아니면 로그인 사용자는 예전 추천(/archive/taste), 비로그인은 홈.
 */
export function recommendRedirectTarget(v: { editorial: boolean; loggedIn: boolean }, sp: { area?: string; pa?: string; category?: string }): string {
  if (!v.editorial) return v.loggedIn ? "/archive/taste" : "/";
  const p = new URLSearchParams();
  const area = normalizeArea(sp.area ?? sp.pa);
  const category = (sp.category ?? "").trim().slice(0, 40);
  if (area) p.set("area", area);
  if (category) p.set("category", category);
  const s = p.toString();
  return s ? `/find?${s}` : "/find";
}
