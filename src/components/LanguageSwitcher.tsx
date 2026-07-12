"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, localeLabel, type LocaleCode } from "@/lib/locales";
import { LOCALE_COOKIE_NAME, normalizeBcp47 } from "@/lib/localeResolve";

const ONE_YEAR = 60 * 60 * 24 * 365;

function setLocaleCookie(code: string) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${code}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

function hasLocaleCookie(): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${LOCALE_COOKIE_NAME}=`));
}

interface Props {
  currentLocale: LocaleCode;
  availableLocales: LocaleCode[];
}

export default function LanguageSwitcher({ currentLocale, availableLocales }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 쿠키도, Accept-Language도 매칭되지 않아 기본 한국어로 떨어진 경우에만
  // 브라우저 navigator.language로 한 번 더 보정을 시도한다(우선순위 3단계).
  useEffect(() => {
    if (currentLocale !== DEFAULT_LOCALE || hasLocaleCookie()) return;
    const detected = normalizeBcp47(navigator.language);
    if (detected && detected !== DEFAULT_LOCALE && availableLocales.includes(detected)) {
      setLocaleCookie(detected);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (availableLocales.length <= 1) return null;

  function select(code: string) {
    setLocaleCookie(code);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 border transition-colors"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
        {localeLabel(currentLocale)} ▾
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full sm:max-w-xs p-5 space-y-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>Language</p>
            <div className="flex flex-col gap-1">
              {availableLocales.map((code) => (
                <button
                  key={code}
                  onClick={() => select(code)}
                  className="text-left text-sm py-2.5 px-3 border transition-colors"
                  style={{
                    borderColor: code === currentLocale ? "var(--fg)" : "var(--border)",
                    color: code === currentLocale ? "var(--fg)" : "var(--dim)",
                    fontWeight: code === currentLocale ? 600 : 400,
                  }}
                >
                  {localeLabel(code)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
