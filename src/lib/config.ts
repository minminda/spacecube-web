/**
 * 앱 공개 기준 URL. 도메인이 gonggancube.com으로 바뀔 때 이 파일의 fallback만 바꾸면 되도록
 * QR/OG/절대링크 생성 지점을 한 곳으로 모았다. 실제로는 Vercel에 설정된 NEXT_PUBLIC_APP_URL
 * (또는 AUTH_URL)이 우선하므로, 이 fallback은 로컬/프리뷰 환경에서만 쓰인다.
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://gonggancube.com";
}
