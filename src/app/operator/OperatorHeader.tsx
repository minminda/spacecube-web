"use client";

import { useRouter } from "next/navigation";
import CubeGlyph from "@/components/CubeGlyph";
import { adminButtonClass } from "@/components/admin/ui";

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
      style={{ background: "var(--a-bg)", borderBottom: "1px solid var(--a-line)" }}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-8 flex items-center h-14 gap-2">
        <span className="mr-auto flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
            <CubeGlyph outlineWidth={1.4} edgeWidth={1.2} />
          </svg>
          <span className="text-[13px] font-bold tracking-[0.12em]">GONGGANCUBE</span>
          <span className="text-[11px] font-medium tracking-[0.12em]" style={{ color: "var(--a-dim)" }}>OPERATOR</span>
        </span>
        {hasSession && (
          <button type="button" onClick={findAnotherSpace} className={adminButtonClass("ghost", "sm")}>
            운영 공간 찾기
          </button>
        )}
        <button type="button" onClick={endSession} className={adminButtonClass("ghost", "sm")}>
          {hasSession ? "로그아웃" : "처음으로"}
        </button>
      </div>
    </nav>
  );
}
