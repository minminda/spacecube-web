"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { targetUserId: string; initialSaved: boolean; isLoggedIn: boolean; }

export default function SaveTasteButton({ targetUserId, initialSaved, isLoggedIn }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!isLoggedIn) { router.push("/login"); return; }
    setLoading(true);
    if (saved) { await fetch(`/api/tastes/${targetUserId}`, { method: "DELETE" }); setSaved(false); }
    else { await fetch("/api/tastes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId }) }); setSaved(true); }
    setLoading(false);
  }

  return (
    <button onClick={toggle} disabled={loading} className="w-full text-sm py-2 border transition-colors"
      style={saved ? { borderColor: "var(--dim)", color: "var(--dim)" } : { borderColor: "var(--fg)", color: "var(--fg)" }}>
      {loading ? "..." : saved ? "저장됨 ✓" : "[[ 이 취향 저장하기 ]]"}
    </button>
  );
}
