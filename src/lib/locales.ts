/**
 * 공간큐브 다국어 지원 언어 목록. 언어를 추가하려면 이 배열에 한 줄만 더하면 된다
 * (관리자 UI, 번역 생성, 언어 감지/선택이 모두 이 목록을 따른다).
 */
export const SUPPORTED_LOCALES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh-CN", label: "简体中文" },
  { code: "th", label: "ไทย" },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

/** 원문(한국어) 언어 — 이 언어로는 번역을 생성하지 않는다. */
export const DEFAULT_LOCALE: LocaleCode = "ko";

/** 실제로 번역을 생성할 수 있는 언어 (원문 언어 제외). */
export const TRANSLATABLE_LOCALES = SUPPORTED_LOCALES.filter((l) => l.code !== DEFAULT_LOCALE);

export function isSupportedLocale(code: string): code is LocaleCode {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}

export function isTranslatableLocale(code: string): boolean {
  return TRANSLATABLE_LOCALES.some((l) => l.code === code);
}

export function localeLabel(code: string): string {
  return SUPPORTED_LOCALES.find((l) => l.code === code)?.label ?? code;
}
