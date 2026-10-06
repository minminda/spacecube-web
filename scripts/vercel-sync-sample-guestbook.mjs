/**
 * Vercel production 배포 때만 방명록 샘플을 운영 DB에 동기화한다(npm "postbuild" — next build가 성공한 뒤 실행).
 *   - VERCEL_ENV가 production이 아니면(Preview · 로컬 build) 아무것도 하지 않는다.
 *   - 운영 DB 주소는 빌드의 prisma db push와 같은 Vercel 환경 변수(DATABASE_URL)를 그대로 쓴다.
 *   - seed(scripts/seed-sample-guestbook.ts --apply)는 실제 운영 공간 · 현재 질문 기준으로 부족한 만큼만 채우는 멱등 스크립트다
 *     (공간별 잠금 트랜잭션 · 샘플 작성자 글만 생성/정리 · 실제 사용자 데이터는 읽기만).
 *   - 실패 · 시간 초과여도 배포는 막지 않는다 — 원인을 로그로 남기고 항상 exit 0.
 */
import { spawn } from "node:child_process";

const TAG = "[sample-guestbook]";
const TIMEOUT_MS = 180_000;

if (process.env.VERCEL_ENV !== "production") {
  console.log(`${TAG} VERCEL_ENV=${process.env.VERCEL_ENV ?? "(없음)"} — production 배포가 아니라 건너뜀`);
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log(`${TAG} DATABASE_URL 없음 — 건너뜀(배포는 계속)`);
  process.exit(0);
}

console.log(`${TAG} production 배포 — 방명록 샘플 동기화 시작`);
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "scripts/seed-sample-guestbook.ts", "--apply"], {
  stdio: "inherit",
  env: process.env,
});
const timer = setTimeout(() => {
  console.error(`${TAG} ${TIMEOUT_MS / 1000}초 안에 끝나지 않아 중단 — 배포는 계속(다음 production 배포 때 다시 시도)`);
  child.kill("SIGTERM");
}, TIMEOUT_MS);
child.on("error", (e) => {
  clearTimeout(timer);
  console.error(`${TAG} 실행 실패 — ${e.message} — 배포는 계속`);
  process.exit(0);
});
child.on("exit", (code, signal) => {
  clearTimeout(timer);
  if (code === 0) console.log(`${TAG} 동기화 완료`);
  else console.error(`${TAG} 동기화 실패(exit ${code ?? signal}) — 위 로그 참고, 배포는 계속(다음 production 배포 때 다시 시도)`);
  process.exit(0);
});
