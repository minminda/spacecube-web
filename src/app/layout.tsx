import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPACECUBE",
  description: "공간 경험을 기록하고 취향을 발견하는 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <div className="max-w-sm mx-auto min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
