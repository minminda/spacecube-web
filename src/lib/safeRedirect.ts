/**
 * 로그인 후 돌아갈 callbackUrl이 같은 오리진의 내부 경로인지 검증한다. `//evil.com`,
 * `/\evil.com` 같은 프로토콜 상대 URL은 브라우저가 외부 사이트로 취급할 수 있으므로
 * 단순 `startsWith("/")` 검사만으로는 부족해 별도로 막는다.
 */
export function sanitizeRedirectPath(path: string | undefined | null): string {
  if (!path) return "/";
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("//") || path.startsWith("/\\")) return "/";
  return path;
}
