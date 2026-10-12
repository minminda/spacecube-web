"use client";

import { useState } from "react";

export interface PickedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** 관리자 공간 폼용 장소 검색 — /api/admin/places/search(서버가 Kakao Local API 호출)만 사용한다. */
export default function PlaceSearch({
  defaultQuery, onPick, mode = "place", placeholder, buttonLabel = "검색",
}: { defaultQuery: string; onPick: (p: PickedPlace) => void; mode?: "place" | "region"; placeholder?: string; buttonLabel?: string }) {
  const [q, setQ] = useState(defaultQuery);
  const [results, setResults] = useState<PickedPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (q.trim().length < (mode === "region" ? 1 : 2)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/places/search?q=${encodeURIComponent(q.trim())}${mode === "region" ? "&mode=region" : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색에 실패했어요.");
      setResults(data.places);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색에 실패했어요.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}
          placeholder={placeholder ?? "예: 북눅 연남"}
          className="flex-1 text-sm px-3 py-2.5 border"
          style={{ background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)", outline: "none" }}
        />
        <button type="button" onClick={() => void search()} disabled={loading || q.trim().length < (mode === "region" ? 1 : 2)} className="text-sm px-4 border disabled:opacity-40" style={{ borderColor: "var(--border)" }}>
          {loading ? "검색 중…" : buttonLabel}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "#b91c1c" }}>{error}</p>}
      {results && results.length === 0 && <p className="text-xs opacity-60">검색 결과가 없어요.</p>}
      {results && results.length > 0 && (
        <ul className="border divide-y" style={{ borderColor: "var(--border)" }}>
          {results.map((p, i) => (
            <li key={`${p.name}-${i}`}>
              <button
                type="button"
                onClick={() => { onPick(p); setResults(null); }}
                className="w-full text-left px-3 py-2 text-sm hover:opacity-70"
              >
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs opacity-60">{p.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
