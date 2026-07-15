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
};

export default nextConfig;
