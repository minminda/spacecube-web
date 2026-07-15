import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import Navbar from "@/components/Navbar";
import { ENABLE_DARK_MODE_TOGGLE } from "@/lib/features";

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
    <html lang="ko" data-theme="light">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
      </head>
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <Navbar />
        <div className="max-w-sm md:max-w-2xl mx-auto min-h-screen">
          {children}
        </div>
        <OnboardingOverlay />
        {ENABLE_DARK_MODE_TOGGLE && <ThemeToggle />}
      </body>
    </html>
  );
}
