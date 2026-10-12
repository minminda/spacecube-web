/* ── 공간 상세 주소 → 지도 좌표 자동 연결 ─────────────────────────────────
   Space 저장 시 서버가 location(상세 주소)을 Kakao 주소 검색으로 geocode 해 lat/lng 를 채운다.
   geocoding 실패는 저장을 막지 않는다(좌표만 비어 있게 됨). 입력한 주소 문자열은 덮어쓰지 않는다. ── */

import { searchKakaoAddress, type AddressMatch } from "@/lib/kakaoLocal";

export type Coord = { lat: number; lng: number };
export type GeocodeStatus = "linked" | "kept" | "manual" | "failed" | "skipped";

/** 후보가 이 거리(m) 안에 모여 있으면 같은 곳으로 본다. */
const SAME_PLACE_METERS = 150;

function meters(a: Coord, b: Coord): number {
  const dLat = (a.lat - b.lat) * 111_000;
  const dLng = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** 주소 검색 결과가 하나의 위치로 명확할 때만 좌표를 돌려준다(동·구 단위 REGION 결과, 여러 곳으로 갈리는 결과는 null). */
export function pickUnambiguous(matches: AddressMatch[]): Coord | null {
  const precise = matches.filter((m) => m.addressType !== "REGION");
  if (precise.length === 0) return null;
  const first = precise[0];
  if (!precise.every((m) => meters(first, m) <= SAME_PLACE_METERS)) return null;
  return { lat: first.lat, lng: first.lng };
}

export async function geocodeAddress(address: string): Promise<Coord | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    return pickUnambiguous(await searchKakaoAddress(q));
  } catch (e) {
    // 키 값은 절대 로그에 남기지 않는다 — 오류 코드만.
    console.warn("[spaceGeocode] 실패:", e instanceof Error ? e.message : "unknown");
    return null;
  }
}

function sameCoord(a: Coord | null, b: Coord | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
}

export interface ResolveInput {
  /** 저장된 값(신규 공간이면 null) */
  existing: { location: string; coord: Coord | null } | null;
  /** 폼이 보낸 값 */
  location: string;
  incoming: Coord | null;
}

/**
 * 저장할 좌표 결정.
 * - 폼이 기존과 다른 좌표를 보냄 = 관리자가 직접 위치를 고름 → 그대로 신뢰(수동 보정).
 * - 그렇지 않고 (신규 | 주소 변경 | 주소 있음+좌표 없음)이면 geocode.
 * - 주소가 바뀌었는데 geocode 실패 → 예전 주소의 좌표를 남기지 않고 null.
 * - 그 외엔 기존 좌표 유지(Kakao 호출 없음).
 */
export async function resolveSpaceCoord(
  input: ResolveInput,
  geocode: (address: string) => Promise<Coord | null> = geocodeAddress,
): Promise<{ coord: Coord | null; status: GeocodeStatus }> {
  const { existing, incoming } = input;
  const location = input.location.trim();
  const existingCoord = existing?.coord ?? null;

  if (incoming && !sameCoord(incoming, existingCoord)) return { coord: incoming, status: "manual" };

  const addressChanged = !existing || existing.location.trim() !== location;
  const current = incoming ?? existingCoord;
  const needsGeocode = !!location && (addressChanged || !current);

  if (!needsGeocode) return { coord: current, status: "kept" };

  const found = await geocode(location);
  if (found) return { coord: found, status: "linked" };
  return { coord: addressChanged ? null : current, status: "failed" };
}
