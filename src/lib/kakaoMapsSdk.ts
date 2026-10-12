/* eslint-disable @typescript-eslint/no-explicit-any */
/** Kakao Maps JavaScript SDK 로더(브라우저 전용) — 관리자 지도와 내 공간 지도가 함께 쓴다. 장소 검색(REST)은 호출하지 않는다. */
declare global {
  interface Window {
    kakao?: any;
  }
}

let pending: Promise<any> | null = null;

export function loadKakaoMaps(key: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const done = () => window.kakao.maps.load(() => resolve(window.kakao));
    if (window.kakao?.maps?.load) return done();
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    s.async = true;
    s.onload = done;
    s.onerror = () => {
      s.remove();
      pending = null; // 실패 후 재시도 가능
      reject(new Error("load"));
    };
    document.head.appendChild(s);
  });
  return pending;
}
