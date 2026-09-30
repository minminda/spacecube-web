import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveOperatorSpaceOrRedirect } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/config";
import { resolveSpaceTypeLabel } from "@/lib/spaceType";
import OperatorBackLink from "../OperatorBackLink";
import { AdminPageHeader, adminButtonClass } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "내 공간 관리 — 공간큐브 운영",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OperatorSpacePage({ params }: Props) {
  const { slug: slugParam } = await params;
  const { id: spaceId, slug } = await resolveOperatorSpaceOrRedirect(slugParam, "/space");

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: {
      cube: { select: { code: true } },
      spaceTagLinks: { include: { tag: { include: { categoryRef: true } } } },
    },
  });
  if (!space) notFound();
  const typeLabel = resolveSpaceTypeLabel(space.spaceTagLinks, space.type);

  const pageUrl = `${getBaseUrl()}/space/${space.slug}`;

  return (
    <main className="flex flex-col gap-6">
      <OperatorBackLink slug={slug} />

      <AdminPageHeader title="내 공간" description={`${space.name}의 현장 공간 페이지 정보입니다. 공간 정보 수정이 필요하면 공간큐브에 요청해주세요.`} />

      {space.imageUrl && (
        <div className="w-full aspect-video border rounded-lg overflow-hidden" style={{ borderColor: "var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={space.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="a-card px-4 text-sm">
        <Row label="공간 유형" value={typeLabel} />
        <Row label="공개 상태" value={space.isActive ? "공개 중" : "비공개"} />
        <Row label="공간 페이지 URL" value={pageUrl} mono />
        <Row label="연결된 큐브 코드" value={space.cube?.code ?? "미배정"} />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className="text-[15px] font-semibold">공간 페이지 미리보기</p>
        <div className="w-full h-[480px] border rounded-lg overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <iframe src={`/space/${space.slug}`} className="w-full h-full" style={{ border: "none" }} title="공간 페이지 미리보기" />
        </div>
      </div>

      <a
        href={`/space/${space.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${adminButtonClass("primary")} h-11`}
      >
        공간 페이지 보기
      </a>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-3 [&:not(:last-child)]:border-b" style={{ borderColor: "var(--border)" }}>
      <span style={{ color: "var(--dim)" }}>{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
