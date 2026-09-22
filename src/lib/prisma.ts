import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __prismaProdWarned: boolean | undefined;
};

// 이 프로젝트는 별도 스테이징/테스트 DB 없이 로컬 개발이 실제 운영 Neon DB를 직접 사용하는
// 기존 관행을 그대로 유지한다(구조 변경 아님) — 다만 개발자가 그 사실을 매 순간 인지하도록
// NODE_ENV=production이 아닐 때 접속 호스트만(자격증명 제외) 한 번 경고로 남긴다.
if (process.env.NODE_ENV !== "production" && !globalForPrisma.__prismaProdWarned) {
  globalForPrisma.__prismaProdWarned = true;
  try {
    const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : null;
    if (host) {
      console.warn(
        `[prisma] NODE_ENV=${process.env.NODE_ENV ?? "undefined"} 상태로 DB에 연결합니다: ${host}\n` +
          `         별도 테스트 DB가 없다면 이 요청은 운영 데이터에 직접 영향을 줍니다.`
      );
    }
  } catch {
    // DATABASE_URL이 없거나 파싱 불가한 경우 경고를 건너뛴다(부수효과 없음).
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
