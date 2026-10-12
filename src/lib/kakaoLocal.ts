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

async function kakaoGet<T>(path: string, query: string): Promise<T> {
  const key = getKakaoRestKey();
  if (!key) throw new Error("NO_KEY");
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/${path}.json?size=8&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KAKAO_${res.status}`);
  return (await res.json()) as T;
}

/** 지역 중심점 검색 — 주소 검색(동·구 이름에 강함)을 먼저, 부족하면 키워드 검색으로 채운다. 서버 전용. */
export async function searchKakaoRegions(query: string): Promise<PlaceResult[]> {
  const addr = await kakaoGet<{ documents?: { address_name: string; x: string; y: string }[] }>("address", query).catch((e) => {
    if (e instanceof Error && e.message === "NO_KEY") throw e;
    return { documents: [] };
  });
  const fromAddress: PlaceResult[] = (addr.documents ?? []).map((d, i) => ({
    id: `addr-${i}`,
    name: d.address_name,
    address: d.address_name,
    lat: Number(d.y),
    lng: Number(d.x),
  }));
  const merged = fromAddress.length >= 3 ? fromAddress : [...fromAddress, ...(await searchKakaoPlaces(query))];
  const seen = new Set<string>();
  return merged
    .filter((p) => isValidKoreaCoord(p.lat, p.lng))
    .filter((p) => {
      const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);
}

export interface AddressMatch {
  addressType: string; // REGION | ROAD | REGION_ADDR | ROAD_ADDR
  lat: number;
  lng: number;
}

/** 주소 문자열 → 좌표 후보(Kakao 주소 검색 API). 공간 상세 주소 자동 연결용, 서버 전용. 오류는 던진다. */
export async function searchKakaoAddress(address: string): Promise<AddressMatch[]> {
  const key = getKakaoRestKey();
  if (!key) throw new Error("NO_KEY");
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?size=5&query=${encodeURIComponent(address)}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`KAKAO_${res.status}`);
  const json = (await res.json()) as { documents?: { address_type?: string; x: string; y: string }[] };
  return (json.documents ?? [])
    .map((d) => ({ addressType: d.address_type ?? "", lat: Number(d.y), lng: Number(d.x) }))
    .filter((m) => isValidKoreaCoord(m.lat, m.lng));
}
