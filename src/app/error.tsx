"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">SPACECUBE / ERROR</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          &gt; 오류가 발생했어.
        </p>
        <p className="text-xs" style={{ color: "var(--border)" }}>
          {error.message || "알 수 없는 오류"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={reset}
          className="text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          [[ 다시 시도 ]]
        </button>
        <Link href="/" className="text-xs text-center" style={{ color: "var(--dim)" }}>
          &lt; 홈으로
        </Link>
      </div>
    </main>
  );
}
