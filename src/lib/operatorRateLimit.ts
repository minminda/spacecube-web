/* ── PIN 검증 API용 간단한 in-memory rate limit ──────────────────────────
   같은 공간(spaceId) + 같은 IP 기준으로 짧은 시간 안에 너무 많은 오답 시도를 막는다.
   한계: 프로세스 메모리에만 저장하므로 서버리스/다중 인스턴스 환경에서는 인스턴스별로 카운터가
   분리되어 완전한 방어는 아니다 — 더 강한 방어가 필요하면 Redis 등 공유 스토어가 필요하다. */

const WINDOW_MS = 10 * 60 * 1000; // 10분
const MAX_ATTEMPTS = 8;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// 메모리 누수 방지 — 호출될 때마다 오래된 항목을 솎아낸다(별도 타이머 불필요).
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

export function isRateLimited(spaceId: string, ip: string): boolean {
  const now = Date.now();
  sweep(now);
  const key = `${spaceId}:${ip}`;
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) return false;
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(spaceId: string, ip: string): void {
  const now = Date.now();
  const key = `${spaceId}:${ip}`;
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function resetAttempts(spaceId: string, ip: string): void {
  buckets.delete(`${spaceId}:${ip}`);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
