"use client";

import { useSyncExternalStore } from "react";
import SettingsSection from "@/components/settings/SettingsSection";
import { THEME_ATTRIBUTE, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, parseTheme, type Theme } from "@/lib/theme";

function currentTheme(): Theme {
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) === "dark" ? "dark" : "light";
}

function paint(theme: Theme) {
  if (theme === "dark") document.documentElement.setAttribute(THEME_ATTRIBUTE, "dark");
  else document.documentElement.removeAttribute(THEME_ATTRIBUTE);
}

/** 테마를 바꾼다 — 화면에 바로 적용하고 이 기기(localStorage)에 저장한다. 저장소를 못 쓰는 환경이어도 이번 화면에는 적용된다. */
export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* 저장소를 못 쓰면 이번 방문에서만 적용 */
  }
  paint(theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    // 다른 탭에서 바꾼 테마를 이 탭에도 맞춘다
    if (e.key === THEME_STORAGE_KEY) {
      paint(parseTheme(e.newValue));
      onChange();
    }
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * 설정 › 화면 테마 — [라이트 | 다크]. 누르면 바로 바뀌고 이 기기에 저장된다(로그인 여부와 상관없이 같은 방식).
 * 서버는 항상 라이트로 그리고, 첫 페인트 전에 layout의 스크립트가 저장된 다크를 html에 붙인다(깜빡임 없음).
 */
export default function ThemeSetting() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  return (
    <SettingsSection title="화면 테마" description="이 기기에서 보이는 화면의 밝기예요. 시스템 설정과 상관없이 고른 대로 유지돼요.">
      <div role="radiogroup" aria-label="화면 테마" className="grid grid-cols-2 max-w-[360px]" style={{ border: "1px solid var(--ed-fg)" }}>
        {([["light", "라이트"], ["dark", "다크"]] as const).map(([value, label], i) => {
          const on = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => applyTheme(value)}
              className="h-[46px] text-sm font-semibold transition-colors"
              style={{ background: on ? "var(--ed-fg)" : "var(--ed-bg)", color: on ? "var(--ed-bg)" : "var(--ed-fg)", borderLeft: i > 0 ? "1px solid var(--ed-fg)" : undefined }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
