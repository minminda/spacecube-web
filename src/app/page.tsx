import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-col justify-center min-h-screen px-6 py-12 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">SPACECUBE v1.0</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-3">
        <p className="text-2xl tracking-widest">□ SPACECUBE</p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          &gt; 공간 경험을 기록하고<br />
          &nbsp;&nbsp;취향을 발견해봐.
        </p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {session ? (
        <div className="space-y-3">
          <Link href="/archive" className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors" style={{ borderColor: "var(--fg)" }}>
            [[ 내 아카이브 ]]
          </Link>
          <Link href="/owner" className="block text-sm py-2 px-4 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            [[ 공간 사장님이에요 ]]
          </Link>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; 공간 안의 큐브를 스캔해서 시작해봐.
          </p>
        </div>
      ) : (
        <Link href="/login" className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors" style={{ borderColor: "var(--fg)" }}>
          [[ 시작하기 ]]
        </Link>
      )}
    </main>
  );
}
