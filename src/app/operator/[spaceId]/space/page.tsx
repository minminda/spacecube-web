import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/config";
import OperatorBackLink from "../OperatorBackLink";

export const metadata: Metadata = {
  title: "내 공간 관리 — 공간큐브 운영",
};

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function OperatorSpacePage({ params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) redirect("/operator");

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { cube: { select: { code: true } } },
  });
  if (!space) notFound();

  const pageUrl = `${getBaseUrl()}/space/${space.slug}`;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <OperatorBackLink spaceId={spaceId} />

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>내 공간 관리</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      {space.imageUrl && (
        <div className="w-full aspect-video border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={space.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-3 text-sm">
        <Row label="공간 유형" value={space.type} />
        <Row label="공개 상태" value={space.isActive ? "공개 중" : "비공개"} />
        <Row label="공간 페이지 URL" value={pageUrl} mono />
        <Row label="연결된 큐브 코드" value={space.cube?.code ?? "미배정"} />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간 페이지 미리보기</p>
        <div className="w-full h-[480px] border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <iframe src={`/space/${space.slug}`} className="w-full h-full" style={{ border: "none" }} title="공간 페이지 미리보기" />
        </div>
      </div>

      <a
        href={`/space/${space.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-center text-sm font-medium py-3 px-4 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
        style={{ borderColor: "var(--fg)" }}
      >
        공간 페이지 보기
      </a>
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
