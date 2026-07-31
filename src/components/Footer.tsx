"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // 파일럿 안내 문구는 첫인상(홈페이지)에서만 보여주고, 공간/방명록/아카이브 등 나머지 사용자
  // 경험 화면은 화면을 복잡하게 만들지 않도록 푸터 없이 그대로 둔다.
  if (pathname !== "/") return null;

  return (
    <footer className="w-full" style={{ background: "#000" }}>
      <div className="max-w-sm md:max-w-2xl mx-auto px-6 py-4">
        <p className="text-xs" style={{ color: "#fff" }}>현재 파일럿 운영 중입니다</p>
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
