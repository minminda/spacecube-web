"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface Props {
  spaceId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
}

export default function SaveSpaceButton({ spaceId, initialSaved, isLoggedIn }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    setLoading(true);
    if (saved) {
      await fetch(`/api/spaces/${spaceId}/saved`, { method: "DELETE" });
      setSaved(false);
    } else {
      await fetch(`/api/spaces/${spaceId}/saved`, { method: "POST" });
      setSaved(true);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs px-3 py-1.5 border transition-colors disabled:opacity-50"
      style={saved ? { borderColor: "var(--dim)", color: "var(--dim)" } : { borderColor: "var(--fg)", color: "var(--fg)" }}
    >
      {loading ? "…" : saved ? "저장됨 ✓" : "저장"}
    </button>
  );
}
