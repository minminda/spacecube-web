"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function HomeLogoutButton() {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    if (loading) return;
    setLoading(true);
    signOut({ callbackUrl: "/" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-sm disabled:opacity-60"
      style={{ color: "var(--dim)" }}
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
