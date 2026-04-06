"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

interface Props {
  targetUserId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
  lang: Lang;
}

export default function SaveTasteButton({ targetUserId, initialSaved, isLoggedIn, lang }: Props) {
  const ko = lang === "ko";
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setLoading(true);
    if (saved) {
      await fetch(`/api/tastes/${targetUserId}`, { method: "DELETE" });
      setSaved(false);
    } else {
      await fetch("/api/tastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      setSaved(true);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="w-full text-sm py-2 border transition-colors"
      style={
        saved
          ? { borderColor: "var(--dim)", color: "var(--dim)" }
          : { borderColor: "var(--fg)", color: "var(--fg)" }
      }
    >
      {loading
        ? "..."
        : saved
          ? (ko ? "저장됨 ✓" : "Saved ✓")
          : (ko ? "[[ 이 취향 저장하기 ]]" : "[[ Save This Taste ]]")}
    </button>
  );
}
