import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR 스캔 — 공간큐브",
  description: "공간 안의 큐브에 있는 QR을 스캔하면 그 공간의 이야기가 시작됩니다.",
};

/**
 * QR 스캔 진입점. 실제 카메라 스캐너는 아직 연결 전이라
 * 뷰파인더 자리와 안내 문구만 있는 준비 중 화면을 보여준다.
 * 추후 실제 스캐너 붙일 때는 아래 뷰파인더 영역에
 * 카메라 프리뷰 + 디코더 컴포넌트만 끼워 넣으면 되도록 구조를 맞춰둔다.
 */
export default function ScanPage() {
  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / SCAN</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← 홈</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* 뷰파인더 자리 — 추후 카메라 프리뷰가 들어올 영역 */}
        <div
          className="w-full max-w-xs aspect-square flex items-center justify-center border"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="w-2/3 aspect-square border-2 border-dashed" style={{ borderColor: "var(--dim)" }} />
        </div>

        <div className="text-center space-y-2 max-w-xs">
          <p className="text-sm font-medium">QR 스캔 준비 중입니다.</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            공간 안의 큐브를 찾아 QR을 스캔하면
            <br />
            그 공간의 이야기가 시작돼요.
          </p>
        </div>
      </div>

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
