import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { getCubeUrl } from "@/lib/cube";
import CubeQR from "@/components/CubeQR";
import OperatorBackLink from "../OperatorBackLink";

export const metadata: Metadata = {
  title: "큐브·QR 확인 — 공간큐브 운영",
};

interface Props {
  params: Promise<{ spaceId: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "정상 연결됨",
  UNASSIGNED: "미배정",
  DISABLED: "비활성화됨",
};

export default async function OperatorCubePage({ params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) redirect("/operator");

  const space = await prisma.space.findUnique({ where: { id: spaceId }, include: { cube: true } });
  if (!space) notFound();

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <OperatorBackLink spaceId={spaceId} />

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>큐브·QR 확인</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      {!space.cube ? (
        <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          이 공간에는 아직 큐브가 연결되지 않았습니다. 공간큐브 관리자에게 문의해주세요.
        </p>
      ) : (
        <>
          <div className="space-y-3 text-sm">
            <Row label="연결된 큐브 코드" value={space.cube.code} mono />
            <Row label="연결된 공간" value={space.name} />
            <Row label="QR 연결 상태" value={STATUS_LABELS[space.cube.status] ?? space.cube.status} />
            <Row label="실제 QR URL" value={getCubeUrl(space.cube.code)} mono />
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div className="flex flex-col items-center p-6 border gap-4" style={{ borderColor: "var(--border)" }}>
            <CubeQR url={getCubeUrl(space.cube.code)} code={space.cube.code} size={200} showActions />
          </div>

          <div className="flex gap-2 flex-wrap">
            <a
              href={getCubeUrl(space.cube.code)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
              style={{ borderColor: "var(--fg)" }}
            >
              공간 QR 테스트
            </a>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
            연결 변경, QR 재발급, 큐브 재배정은 공간큐브 관리자만 할 수 있습니다. 문제가 있다면 공간큐브 관리자에게 문의해주세요.
          </p>
        </>
      )}
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--dim)" }}>{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
