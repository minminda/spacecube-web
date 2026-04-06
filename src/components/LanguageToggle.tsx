"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

export default function LanguageToggle() {
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
    if (match?.[1] === "en") setLang("en");
  }, []);

  function toggle() {
    const next: Lang = lang === "ko" ? "en" : "ko";
    document.cookie = `lang=${next}; path=/; max-age=31536000`;
    setLang(next);
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      className="fixed bottom-5 right-16 text-xs px-2 py-1 border transition-colors z-50"
      style={{
        borderColor: "var(--border)",
        color: "var(--dim)",
        background: "var(--bg)",
      }}
    >
      {lang === "ko" ? "[EN]" : "[한]"}
    </button>
  );
}
