import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-8">
      <div className="text-center space-y-3">
        <div className="text-5xl font-thin tracking-widest mb-2">□</div>
        <h1 className="text-2xl font-medium tracking-tight">공간큐브</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          공간 경험을 기록하고<br />
          취향을 발견해봐.
        </p>
      </div>

      <div className="w-full space-y-3">
        {session ? (
          <>
            <Link
              href="/archive"
              className="block w-full text-center py-3 rounded-full text-sm"
              style={{ background: "var(--fg)", color: "var(--bg)" }}
            >
              내 아카이브 보기
            </Link>
            <Link
              href="/owner"
              className="block w-full text-center py-3 rounded-full text-sm border"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              공간 사장님이에요
            </Link>
            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              공간 안의 큐브를 스캔해서 기록을 시작해봐.
            </p>
          </>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center py-3 rounded-full text-sm"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            시작하기
          </Link>
        )}
      </div>
    </main>
  );
}
