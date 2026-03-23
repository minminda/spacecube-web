"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      onClick={toggle}
      className="fixed bottom-5 right-4 text-xs px-2 py-1 border transition-colors z-50"
      style={{
        borderColor: "var(--border)",
        color: "var(--dim)",
        background: "var(--bg)",
      }}
    >
      {theme === "dark" ? "[light]" : "[dark]"}
    </button>
  );
}
