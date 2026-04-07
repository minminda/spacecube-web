"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

const CYCLE: Lang[] = ["ko", "en", "ja"];
const NEXT_LABEL: Record<Lang, string> = {
  ko: "[EN]",
  en: "[日]",
  ja: "[한]",
};

export default function LanguageToggle() {
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
    const val = match?.[1];
    if (val === "en" || val === "ja") setLang(val);
  }, []);

  function toggle() {
    const next = CYCLE[(CYCLE.indexOf(lang) + 1) % CYCLE.length];
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
      {NEXT_LABEL[lang]}
    </button>
  );
}
