import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import OnboardingOverlay from "@/components/OnboardingOverlay";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spacecube-web.vercel.app";

export const metadata: Metadata = {
  title: "공간큐브",
  description: "공간 경험을 기록하고 취향을 발견하는 서비스",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "공간큐브",
    description: "공간 경험을 기록하고 취향을 발견하는 서비스",
    url: BASE_URL,
    siteName: "공간큐브",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "공간큐브",
    description: "공간 경험을 기록하고 취향을 발견하는 서비스",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
        {/* FOUC 방지: 저장된 테마를 React 하이드레이션 전에 적용 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <div className="max-w-sm mx-auto min-h-screen">
          {children}
        </div>
        <OnboardingOverlay />
        <LanguageToggle />
        <ThemeToggle />
      </body>
    </html>
  );
}
