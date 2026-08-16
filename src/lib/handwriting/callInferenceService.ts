/**
 * EXPERIMENTAL ONLY — Next.js API 라우트가 Python 추론 서비스를 호출할 때 공용으로 쓰는
 * 얇은 fetch 래퍼. 비밀 헤더를 서버에서만 붙이고(브라우저에는 절대 노출 안 됨), Cloud Run
 * 같은 무료/저비용 호스팅의 콜드 스타트를 감안해 최초 실패 시 한 번만 더 긴 타임아웃으로
 * 재시도한다 — 무한 대기는 아니다.
 */
import { HANDWRITING_SERVICE_URL, HANDWRITING_SERVICE_SECRET } from "@/lib/handwriting/features";

// /encode 자체 연산이 48자 기준 실측 ~22초(모델을 이미 메모리에 올려둔 상태에서도) —
// 콜드 스타트 유무와 무관하게 이 값보다 짧으면 항상 재시도로 넘어가 버리므로 여유 있게 잡는다.
const FIRST_TIMEOUT_MS = 35_000;
const RETRY_TIMEOUT_MS = 90_000; // 드물게 남아있을 수 있는 콜드 스타트를 감안한 재시도 타임아웃

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function callHandwritingService(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (HANDWRITING_SERVICE_SECRET) headers.set("X-Handwriting-Secret", HANDWRITING_SERVICE_SECRET);
  const url = `${HANDWRITING_SERVICE_URL}${path}`;

  try {
    return await fetchWithTimeout(url, { ...init, headers }, FIRST_TIMEOUT_MS);
  } catch {
    // 콜드 스타트로 첫 시도가 타임아웃/실패했을 수 있으니 한 번만 더 넉넉하게 재시도한다.
    return await fetchWithTimeout(url, { ...init, headers }, RETRY_TIMEOUT_MS);
  }
}
