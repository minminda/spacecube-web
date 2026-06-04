"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "공간들", href: "/discover", match: (p: string) => p === "/" || p.startsWith("/discover") || p.startsWith("/stories") || p.startsWith("/story") || p.startsWith("/space") },
  { label: "공간큐브", href: "/about", match: (p: string) => p.startsWith("/about") },
  { label: "추천 방식", href: "/recommendation", match: (p: string) => p.startsWith("/recommendation") },
];

export default function Navbar() {
  const pathname = usePathname();

  const isOwner = pathname.startsWith("/owner");
  if (isOwner) return null;

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}
    >
      <div className="max-w-2xl mx-auto px-6 flex items-center h-14 gap-8">
        <Link
          href="/"
          className="text-xs tracking-widest mr-auto transition-opacity"
          style={{ color: "#fff", opacity: 0.35 }}
        >
          ■
        </Link>

        {NAV_ITEMS.map(({ label, href, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="text-xs tracking-wide whitespace-nowrap transition-opacity hover:opacity-100"
              style={{
                color: "#fff",
                opacity: active ? 1 : 0.4,
                fontWeight: active ? 500 : 400,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
