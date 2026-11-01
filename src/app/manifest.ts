import type { MetadataRoute } from "next";

/* 홈 화면에 추가했을 때만 쓰이는 기본 웹앱 정보 — 설치를 요구하지 않고, Service Worker · 오프라인 캐시는 없다.
   QR을 기본 카메라로 스캔해 브라우저로 여는 흐름은 그대로다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "공간큐브",
    short_name: "공간큐브",
    description: "공간 경험을 기록하고 취향을 발견하는 서비스",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
