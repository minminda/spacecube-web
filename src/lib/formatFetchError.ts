/**
 * fetch가 예외로 reject됐을 때(오프라인, 연결 중단, 타임아웃 등) 사용자에게 보여줄 문구로
 * 변환한다. AbortController 타임아웃(AbortError)과 그 외 네트워크 예외를 구분한다.
 * res.ok===false(서버가 정상 응답했지만 실패)인 경우는 서버가 내려준 error 메시지를
 * 그대로 쓰는 게 더 정확하므로 이 함수의 대상이 아니다 — 각 호출부에서 처리한다.
 */
export function formatFetchException(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "연결이 너무 느려요. 다시 시도해주세요.";
  }
  return "네트워크 연결을 확인하고 다시 시도해주세요.";
}
