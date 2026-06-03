"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DistrictMap from "./DistrictMap";

const DISTRICTS = ["서촌", "성수", "망원", "북촌", "가로수길", "이태원", "홍대", "연남동"];

export default function DiscoverEntry() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  function go(district: string) { setSelected(district); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!DISTRICTS.includes(trimmed)) router.push(`/discover?district=${encodeURIComponent(trimmed)}`);
    else go(trimmed);
  }

  if (selected) {
    return <div className="space-y-3"><DistrictMap selected={selected} onDone={() => setSelected(null)} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DISTRICTS.map((d) => (
          <button
            key={d}
            onClick={() => go(d)}
            className="text-xs px-3 py-1.5 border transition-colors hover:border-[var(--fg)] hover:text-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {d}
          </button>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 border-b pb-2"
        style={{ borderColor: "var(--border)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="지역 직접 입력"
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: "var(--fg)" }}
        />
        <button type="submit" className="text-sm flex-shrink-0" style={{ color: "var(--dim)" }}>→</button>
      </form>
    </div>
  );
}
