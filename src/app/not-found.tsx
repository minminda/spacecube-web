import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 / 404</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          &gt; 이 공간은 존재하지 않아.
        </p>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          &nbsp;&nbsp;삭제됐거나 잘못된 주소야.
        </p>
      </div>

      <Link
        href="/"
        className="text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors text-center"
        style={{ borderColor: "var(--fg)" }}
      >
        [[ 홈으로 ]]
      </Link>
    </main>
  );
}
