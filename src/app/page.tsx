import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import DiscoverEntry from "./DiscoverEntry";

export default async function Home() {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 gap-8">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 v1.0</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-3">
        <p className="text-2xl tracking-widest">□ 공간큐브</p>
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          &gt; 공간 경험을 기록하고<br />
          &nbsp;&nbsp;취향을 발견해봐.
        </p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* 탐험 진입 */}
      <div className="space-y-4">
        <p className="text-xs" style={{ color: "var(--dim)" }}>// WHERE DO YOU WANT TO GO</p>
        <DiscoverEntry />
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {/* 유저 메뉴 */}
      {session ? (
        <div className="space-y-3">
          <Link
            href="/archive"
            className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            [[ 내 아카이브 ]]
          </Link>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; 공간 안의 큐브를 스캔해서 시작해봐.
          </p>
          {admin && (
            <Link
              href="/owner"
              className="block text-xs py-1 px-2 border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              [[ 관리자 ]]
            </Link>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="block text-sm py-2 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          [[ 시작하기 ]]
        </Link>
      )}
    </main>
  );
}
