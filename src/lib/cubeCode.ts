import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const CUBE_CODE_PREFIX = "SC-";
const CODE_PAD = 4;
const MAX_RETRIES = 5;

function parseCubeNumber(code: string): number {
  const match = new RegExp(`^${CUBE_CODE_PREFIX}(\\d+)$`).exec(code);
  return match ? parseInt(match[1], 10) : 0;
}

function formatCubeCode(n: number): string {
  return `${CUBE_CODE_PREFIX}${String(n).padStart(CODE_PAD, "0")}`;
}

/**
 * 큐브를 quantity개 일괄 생성한다. 기존 코드 중 가장 큰 번호 다음부터 이어서 생성한다.
 *
 * 여러 관리자가 동시에 생성 버튼을 눌러도 코드가 중복되지 않도록, "가장 큰 번호 조회 →
 * 생성"을 하나의 트랜잭션으로 묶고, code의 DB unique 제약과 부딪히면(P2002) 최신 번호를
 * 다시 읽어 재시도한다. 관리자가 수동으로 누르는 드문 동작이라 이 정도 재시도로 충분하다.
 */
export async function generateCubes(quantity: number): Promise<{ id: string; code: string }[]> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.cube.findMany({
          where: { code: { startsWith: CUBE_CODE_PREFIX } },
          select: { code: true },
        });
        const maxNumber = existing.reduce((max, c) => Math.max(max, parseCubeNumber(c.code)), 0);

        const codes = Array.from({ length: quantity }, (_, i) => formatCubeCode(maxNumber + i + 1));

        await tx.cube.createMany({ data: codes.map((code) => ({ code })) });

        return tx.cube.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
          orderBy: { code: "asc" },
        });
      });
    } catch (err) {
      lastError = err;
      const isConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isConflict) throw err;
      // 다른 요청이 같은 번호 대역을 먼저 차지함 — 잠깐 대기 후 최신 번호로 다시 계산
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 70));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("큐브 생성에 실패했습니다.");
}
