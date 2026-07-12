import { DEFAULT_LOCALE } from "@/lib/locales";

export interface LocalizedField {
  value: string | null;
  /** 요청한 언어의 번역이 아니라 영어/한국어로 대체된 경우 true */
  usedFallback: boolean;
}

/**
 * 필드 하나를 "요청 언어 → 영어 → 한국어 원문" 순서로 대체한다.
 * 번역이 일부 필드만 실패했더라도(예: title은 있는데 subtitle이 없음) 필드 단위로 대체되도록
 * 레코드 전체가 아니라 값 하나씩 이 함수를 호출해서 쓴다.
 */
export function resolveLocalizedField(
  locale: string,
  korean: string | null | undefined,
  localeValue: string | null | undefined,
  englishValue: string | null | undefined,
): LocalizedField {
  if (locale === DEFAULT_LOCALE) return { value: korean ?? null, usedFallback: false };
  if (localeValue) return { value: localeValue, usedFallback: false };
  if (locale !== "en" && englishValue) return { value: englishValue, usedFallback: true };
  return { value: korean ?? null, usedFallback: true };
}
