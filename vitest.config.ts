import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

// 현재 모든 테스트는 @/lib/prisma를 vi.mock()으로 대체하므로 실제 DB 연결이 필요 없다.
// 다만 앞으로 실 DB를 쓰는 통합 테스트를 추가할 경우를 대비해, 오직 .env.test(있을 때만)만
// 직접 파싱해서 주입한다 — vite의 loadEnv는 기본적으로 .env(운영 DB를 가리키는 로컬 개발용
// 파일)까지 함께 병합하므로 여기서는 의도적으로 쓰지 않는다. .env.test가 없으면
// process.env.DATABASE_URL은 비어 있고, prisma를 mock하지 않은 테스트는 즉시 연결 실패로
// 눈에 띄게 실패한다(운영 DB로 조용히 새어나가지 않는다).
const testEnvPath = path.resolve(__dirname, ".env.test");
if (fs.existsSync(testEnvPath)) {
  for (const line of fs.readFileSync(testEnvPath, "utf-8").split("\n")) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
