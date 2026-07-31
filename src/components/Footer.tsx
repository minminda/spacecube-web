"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // 관리자·운영자 화면은 완전히 분리된 레이아웃·헤더를 쓰므로(Navbar와 동일 기준) 일반 사용자
  // 공통 푸터를 아예 렌더링하지 않는다.
  if (pathname.startsWith("/admin") || pathname.startsWith("/operator")) return null;

  return (
    <footer className="w-full" style={{ background: "#000" }}>
      <div className="max-w-sm md:max-w-2xl mx-auto px-6 py-4">
        <p className="text-xs" style={{ color: "#fff" }}>현재 파일럿 운영 중입니다.</p>
        <div className="mt-2">
          <p className="text-xs" style={{ color: "#ccc" }}>Contact</p>
          <a href="mailto:gonggancube@gmail.com" className="text-xs" style={{ color: "#ccc" }}>
            gonggancube@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
