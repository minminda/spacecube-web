/**
 * 앱 공개 기준 URL. QR/OG/절대링크 생성 지점을 한 곳으로 모아서, 도메인이 바뀌어도
 * 여기 fallback만 바꾸면 되게 한다. 서버 전용(process.env의 non-public 값도 읽으므로
 * 클라이언트 컴포넌트에서 직접 호출하지 말 것 — 클라이언트에서는 서버가 내려준 값을 prop으로 받아
 * src/lib/cube.ts의 buildCubeUrl처럼 순수 함수로 조합한다).
 *
 * 우선순위:
 * 1. NEXT_PUBLIC_APP_URL — 명시적으로 설정했으면 항상 그 값을 그대로 신뢰(운영/미리보기/로컬 무관)
 * 2. 로컬 개발(next dev, NODE_ENV=development) — localhost로 고정. AUTH_URL이 운영 도메인으로
 *    설정돼 있어도(OAuth 콜백 검증용으로 흔히 그렇게 둠) 로컬에서 만드는 링크가 운영 도메인을
 *    가리키면 안 되므로 여기서 끊는다.
 * 3. Vercel Preview 배포 — VERCEL_ENV=preview일 때 Vercel이 자동 주입하는 VERCEL_URL 사용
 * 4. AUTH_URL — 위 조건에 안 걸리는 기타 환경(예: Vercel 밖 호스팅)의 마지막 수동 설정값
 * 5. 최종 fallback — 운영 도메인
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  return "https://gonggancube.com";
}
