"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DistrictMap from "./DistrictMap";
import type { Lang } from "@/lib/i18n";

const DISTRICTS = ["서촌", "성수", "망원", "북촌", "가로수길", "이태원", "홍대", "연남동"];

interface Props { lang: Lang; }

export default function DiscoverEntry({ lang }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const placeholder =
    lang === "ko" ? "지역 직접 입력_" :
    lang === "ja" ? "エリアを直接入力_" :
    lang === "zh" ? "直接输入区域_" :
    "Enter district name_";

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
          <button key={d} onClick={() => go(d)}
            className="text-xs px-3 py-1 border transition-colors hover:border-[var(--fg)] hover:text-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            {d}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--dim)" }}>&gt;</span>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
          className="flex-1 text-xs bg-transparent outline-none border-b pb-1"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
      </form>
    </div>
  );
}
