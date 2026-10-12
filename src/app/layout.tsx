import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import { ENABLE_DARK_MODE_TOGGLE, ENABLE_INITIAL_ONBOARDING } from "@/lib/features";
import { getBaseUrl } from "@/lib/config";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { RELOAD_SCROLL_TOP_SCRIPT } from "@/lib/reloadScroll";

const BASE_URL = getBaseUrl();

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

export default function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    // data-ed-theme(다크)는 첫 페인트 전에 아래 스크립트가 붙인다 — 서버가 그린 html과 달라지므로 suppressHydrationWarning
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: RELOAD_SCROLL_TOP_SCRIPT }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
      </head>
      <body className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <Navbar />
        <div className="app-shell max-w-sm md:max-w-2xl mx-auto w-full flex-1">
          {children}
        </div>
        {modal}
        <BottomTabBar />
        {ENABLE_INITIAL_ONBOARDING && <OnboardingOverlay />}
        {ENABLE_DARK_MODE_TOGGLE && <ThemeToggle />}
      </body>
    </html>
  );
}
