import Link from "next/link";
import type { Metadata } from "next";
import OperatorHero from "./OperatorHero";
import ProblemSection from "./ProblemSection";
import HowItWorks from "./HowItWorks";
import ValueSection from "./ValueSection";
import ProcessSection from "./ProcessSection";
import FaqSection from "./FaqSection";
import FinalCta from "./FinalCta";

export const metadata: Metadata = {
  title: "운영자님께 — 공간큐브",
  description: "당신의 공간에는 분명 이야기가 있습니다. 공간큐브는 그 이야기를 방문자에게 전달하는 도구입니다.",
  openGraph: {
    title: "운영자님께 — 공간큐브",
    description: "당신의 공간에는 분명 이야기가 있습니다.",
    type: "website",
  },
};

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border)" }} />;
}

export default function OperatorPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-6 pt-10 pb-6">
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <span className="text-xs" style={{ color: "var(--border)" }}>OPERATOR</span>
      </div>

      <Divider />
      <OperatorHero />
      <Divider />
      <ProblemSection />
      <Divider />
      <HowItWorks />
      <Divider />
      <ValueSection />
      <Divider />
      <ProcessSection />
      <Divider />
      <FaqSection />
      <Divider />
      <FinalCta />
    </main>
  );
}
