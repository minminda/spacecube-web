"use client";

import { useRouter } from "next/navigation";

export default function OperatorHeader({ hasSession }: { hasSession: boolean }) {
  const router = useRouter();

  async function endSession() {
    await fetch("/api/operator/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function findAnotherSpace() {
    await fetch("/api/operator/logout", { method: "POST" });
    router.push("/operator");
    router.refresh();
  }

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}
    >
      <div className="max-w-2xl mx-auto px-6 flex items-center h-14 gap-6">
        <span className="text-xs tracking-widest mr-auto" style={{ color: "#fff", opacity: 0.5 }}>
          공간큐브 운영
        </span>
        {hasSession && (
          <button
            type="button"
            onClick={findAnotherSpace}
            className="text-xs tracking-wide whitespace-nowrap transition-opacity hover:opacity-100"
            style={{ color: "#fff", opacity: 0.6 }}
          >
            운영 공간 찾기
          </button>
        )}
        <button
          type="button"
          onClick={endSession}
          className="text-xs tracking-wide whitespace-nowrap transition-opacity hover:opacity-100"
          style={{ color: "#fff", opacity: 0.6 }}
        >
          {hasSession ? "로그아웃" : "처음으로"}
        </button>
      </div>
    </nav>
  );
}
