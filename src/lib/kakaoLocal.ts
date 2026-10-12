/**
 * Kakao Local REST API(키워드 장소 검색) — 서버 전용. REST API 키는 절대 클라이언트로 내보내지 않는다.
 * 키는 KAKAO_REST_API_KEY, 없으면 로그인용 AUTH_KAKAO_ID(같은 Kakao 앱의 REST API 키)를 쓴다.
 */
export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export function getKakaoRestKey(): string | null {
  return process.env.KAKAO_REST_API_KEY?.trim() || process.env.AUTH_KAKAO_ID?.trim() || null;
}

/** 대한민국 대략 범위 — 좌표 오입력/이상 응답 방지용. */
export function isValidKoreaCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= 32 && lat <= 39.5 && lng >= 123 && lng <= 132.5
  );
}

interface KakaoDoc {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

export async function searchKakaoPlaces(query: string): Promise<PlaceResult[]> {
  const key = getKakaoRestKey();
  if (!key) throw new Error("NO_KEY");
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?size=8&query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `KakaoAK ${key}` }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`KAKAO_${res.status}`);
  const json = (await res.json()) as { documents?: KakaoDoc[] };
  return (json.documents ?? [])
    .map((d) => ({
      id: d.id,
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      lat: Number(d.y),
      lng: Number(d.x),
    }))
    .filter((p) => isValidKoreaCoord(p.lat, p.lng));
}
