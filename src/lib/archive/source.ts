/* ── 아카이브 추가 — 링크 판별 · 장소 키(순수 함수) ──────────────────────────────
   외부 페이지 내용을 가져오지 않는다(스크래핑 없음). 붙여넣은 주소의 "종류"만 알아보고, 주소 자체에
   들어 있는 식별자(네이버 플레이스 번호)만 꺼내 기존 공간과 비교한다. 이름은 사용자가 직접 확인·입력한다.
   향후 외부 장소 API를 붙일 때도 이 모듈의 결과(kind, placeId)를 입력으로 쓰면 된다. ── */

import { normalizeArea } from "@/lib/editorial/area";

export type SourceKind = "NAVER_PLACE" | "INSTAGRAM" | "KAKAO_MAP" | "GOOGLE_MAPS" | "WEB";

export const SOURCE_KIND_LABEL: Record<SourceKind | "PHOTO" | "MANUAL", string> = {
  NAVER_PLACE: "네이버 지도",
  INSTAGRAM: "Instagram",
  KAKAO_MAP: "카카오맵",
  GOOGLE_MAPS: "Google 지도",
  WEB: "웹 링크",
  PHOTO: "사진",
  MANUAL: "직접 추가",
};

/** http(s) 주소만 받는다(javascript: 등 차단). 앞뒤 공백·붙여넣기 잡음을 정리한 정규 URL 또는 null. */
export function parseHttpUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  const text = raw.trim().match(/https?:\/\/\S+/i)?.[0];
  if (!text) return null;
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

export function detectSourceKind(u: URL): SourceKind {
  const h = u.hostname.replace(/^www\./, "").toLowerCase();
  if (h === "naver.me" || h.endsWith("map.naver.com") || h.endsWith("place.naver.com")) return "NAVER_PLACE";
  if (h === "instagram.com" || h.endsWith(".instagram.com") || h === "instagr.am") return "INSTAGRAM";
  if (h === "kko.to" || h.endsWith("map.kakao.com")) return "KAKAO_MAP";
  if (h === "maps.app.goo.gl" || h === "goo.gl" || ((h === "google.com" || h.endsWith(".google.com")) && u.pathname.startsWith("/maps"))) return "GOOGLE_MAPS";
  return "WEB";
}

/** 네이버 플레이스 번호 — /place/123, /entry/place/123, /restaurant/123 등. 단축 주소(naver.me)는 번호가 없어 null. */
export function naverPlaceId(u: URL): string | null {
  if (detectSourceKind(u) !== "NAVER_PLACE") return null;
  const m = u.pathname.match(/\/(?:entry\/)?(?:place|restaurant|cafe|hairshop|accommodation|attraction)\/(\d{5,})/);
  if (m) return m[1];
  const q = u.searchParams.get("id") ?? u.searchParams.get("placeId");
  return q && /^\d{5,}$/.test(q) ? q : null;
}

/** 링크 비교용 정규형 — 프로토콜·www·끝 슬래시·추적 파라미터 제거. */
export function canonicalLink(u: URL): string {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const path = u.pathname.replace(/\/+$/, "");
  const keep = new URLSearchParams();
  for (const [k, v] of u.searchParams) if (!/^(utm_|igsh|fbclid|c$|t$)/i.test(k)) keep.set(k, v);
  const q = keep.toString();
  return `${host}${path}${q ? `?${q}` : ""}`;
}

/** 이 공간의 공개 링크(지도·인스타·웹)가 붙여넣은 링크와 같은 장소를 가리키는가. */
export function linkMatchesSpace(pasted: URL, spaceLinks: (string | null | undefined)[]): boolean {
  const pid = naverPlaceId(pasted);
  const target = canonicalLink(pasted);
  for (const raw of spaceLinks) {
    const s = parseHttpUrl(raw);
    if (!s) continue;
    if (canonicalLink(s) === target) return true;
    if (pid && naverPlaceId(s) === pid) return true;
  }
  return false;
}

/** 같은 장소 병합 키 — 이름(공백·기호 제거, 소문자) + 정규화한 지역. "북눅 연남" + "연남동" → "북눅연남|연남". */
export function placeKey(name: string, area?: string | null): string {
  const n = name.toLowerCase().normalize("NFC").replace(/[\s·.,'"()\-_/]+/g, "");
  return `${n}|${normalizeArea(area) ?? ""}`;
}

/** 이름 검색 비교용(공백 무시). */
export function compactName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}
