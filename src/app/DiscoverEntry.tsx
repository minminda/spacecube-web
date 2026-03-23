"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DISTRICTS = ["서촌", "성수", "망원", "북촌", "가로수길", "이태원", "홍대", "연남동"];

export default function DiscoverEntry() {
  const router = useRouter();
  const [input, setInput] = useState("");

  function go(district: string) {
    router.push(`/discover?district=${encodeURIComponent(district)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) go(input.trim());
  }

  return (
    <div className="space-y-4">
      {/* 지역 버튼 */}
      <div className="flex flex-wrap gap-2">
        {DISTRICTS.map((d) => (
          <button
            key={d}
            onClick={() => go(d)}
            className="text-xs px-3 py-1 border transition-colors hover:border-[var(--fg)] hover:text-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* 검색 입력 */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--dim)" }}>&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="지역 직접 입력_"
          className="flex-1 text-xs bg-transparent outline-none border-b pb-1"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
      </form>
    </div>
  );
}
