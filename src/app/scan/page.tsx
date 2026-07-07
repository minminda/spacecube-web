import Link from "next/link";
import type { Metadata } from "next";
import QrScanner from "./QrScanner";

export const metadata: Metadata = {
  title: "QR 스캔 — 공간큐브",
  description: "공간 안의 큐브에 있는 QR을 스캔하면 그 공간의 이야기가 시작됩니다.",
};

export default function ScanPage() {
  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-3">
        <div className="flex justify-between items-center" style={{ color: "var(--dim)" }}>
          <p className="text-xs">공간큐브 / SCAN</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        </div>
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <div className="space-y-1 pt-1">
          <h1 className="text-xl font-bold">공간큐브 스캔</h1>
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            공간 안의 큐브에 있는 QR을 스캔해주세요.
          </p>
        </div>
      </div>

      <QrScanner />

      <div className="space-y-3">
        <p className="text-xs text-center" style={{ color: "var(--border)" }}>QR이 없다면</p>
        <Link
          href="/discover"
          className="block w-full text-center text-sm font-medium py-3 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          공간 둘러보기
        </Link>
      </div>
    </main>
  );
}
