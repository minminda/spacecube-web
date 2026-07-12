import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale, type LocaleCode } from "@/lib/locales";

export const LOCALE_COOKIE_NAME = "sc_locale";

/**
 * BCP-47 언어 태그(en-US, zh-SG 등)를 공간큐브가 지원하는 언어 코드로 정규화한다.
 * 예) en-US/en-GB → en, ja-JP → ja, zh-CN/zh-SG → zh-CN, th-TH → th, ko-KR → ko
 * 매칭되는 지원 언어가 없으면 null.
 */
export function normalizeBcp47(raw: string): LocaleCode | null {
  const lower = raw.trim().toLowerCase();
  if (!lower) return null;
  const primary = lower.split("-")[0];
  // 중국어는 간체(zh-CN) 하나만 지원 — 지역과 무관하게 매핑
  if (primary === "zh") return "zh-CN";
  if (isSupportedLocale(primary)) return primary as LocaleCode;
  return null;
}

/**
 * "en-US,en;q=0.9,ko;q=0.8" 형태의 Accept-Language 헤더를 우선순위대로 파싱한다.
 */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean);
}

interface ResolveOptions {
  /** 방문자가 이전에 직접 선택해 쿠키에 저장한 언어 (있으면 최우선) */
  cookieLocale?: string | null;
  /** 요청의 Accept-Language 헤더 원문 */
  acceptLanguageHeader?: string | null;
  /** 이 공간이 지원하는 언어 목록 (ko 제외, Space.supportedLocales) */
  spaceSupportedLocales: string[];
}

/**
 * 우선순위: 1) 사용자가 이전에 선택한 언어 → 2) Accept-Language → 3) 기본 한국어.
 * (navigator.language 기반 보정은 서버에서 알 수 없어 클라이언트의 LanguageSwitcher가 담당한다.)
 *
 * 신호가 "감지됐지만 이 공간이 지원하지 않는 언어"인 경우와, "애초에 감지된 신호가 없는" 경우를
 * 구분한다 — 전자는 영어를 먼저 시도한 뒤 한국어로, 후자는 곧바로 한국어 기본값으로 떨어진다.
 */
export function resolveInitialLocale({ cookieLocale, acceptLanguageHeader, spaceSupportedLocales }: ResolveOptions): LocaleCode {
  const available = new Set<string>([DEFAULT_LOCALE, ...spaceSupportedLocales]);
  const unsupportedFallback = (): LocaleCode => (available.has("en") ? "en" : DEFAULT_LOCALE);

  if (cookieLocale) {
    const normalized = normalizeBcp47(cookieLocale) ?? (isSupportedLocale(cookieLocale) ? (cookieLocale as LocaleCode) : null);
    if (normalized && available.has(normalized)) return normalized;
    // 쿠키에 값이 있었다는 것 자체가 "언어가 감지됐다"는 뜻 — 이 공간이 지원하지 않는 언어였을 뿐
    if (normalized) return unsupportedFallback();
  }

  if (acceptLanguageHeader) {
    const candidates = parseAcceptLanguage(acceptLanguageHeader);
    for (const candidate of candidates) {
      const normalized = normalizeBcp47(candidate);
      if (normalized && available.has(normalized)) return normalized;
    }
    // 헤더 자체는 있었다면(후보가 우리 5개 언어에 안 맞더라도) "감지됐지만 미지원"으로 처리 —
    // 예) 프랑스어/독일어 브라우저처럼 공간큐브가 아예 지원하지 않는 언어권 방문자
    if (candidates.length > 0) return unsupportedFallback();
  }

  // 쿠키도, 유효하게 해석되는 Accept-Language 후보도 전혀 없음 — 신호 자체가 없는 경우
  return DEFAULT_LOCALE;
}

export function availableLocalesForSpace(spaceSupportedLocales: string[]): LocaleCode[] {
  const codes = new Set<string>([DEFAULT_LOCALE, ...spaceSupportedLocales]);
  return SUPPORTED_LOCALES.filter((l) => codes.has(l.code)).map((l) => l.code);
}
