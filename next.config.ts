import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    // 취향 점수 저장 직후 방명록으로 이동했다가 뒤로가기로 돌아왔을 때, 클라이언트
    // 라우터 캐시가 저장 전 스냅샷을 그대로 보여주지 않도록 dynamic 페이지는
    // 뒤로가기/앞으로가기 포함 매 진입마다 서버에서 다시 조회한다.
    staleTimes: { dynamic: 0 },
  },
  // 관리자 페이지 경로를 /owner → /admin으로 개명했다("운영자(operator)"와의 이름 혼동 제거).
  // 기존 /owner/** 북마크·외부 링크가 깨지지 않도록 하위호환 리다이렉트를 둔다.
  // permanent: false(307) — 나중에 경로를 또 바꿀 여지를 남기려고 영구 리다이렉트는 피한다.
  async redirects() {
    return [
      { source: "/owner", destination: "/admin", permanent: false },
      { source: "/owner/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
