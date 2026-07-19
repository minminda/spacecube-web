/**
 * 순수 문자열 로직만 담는다(DB/env 접근 없음) — 클라이언트 컴포넌트에서도 안전하게 import할 수 있다.
 * DB 조회가 필요한 큐브 로직은 src/lib/cube.ts(서버 전용, 이 파일을 재사용)에 있다.
 */

/** 큐브 코드 정규화 — 대소문자·앞뒤 공백 무관하게 DB 저장 형식(GC-001)으로 통일 */
export function normalizeCubeCode(input: string): string {
  return input.trim().toUpperCase();
}

/** baseUrl + 코드로 큐브 URL 조합(URL 경로는 소문자, 예: https://gonggancube.com/c/gc-001) */
export function buildCubeUrl(baseUrl: string, code: string): string {
  return `${baseUrl}/c/${normalizeCubeCode(code).toLowerCase()}`;
}
